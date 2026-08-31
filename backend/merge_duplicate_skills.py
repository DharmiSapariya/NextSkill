import logging
import time
from typing import List, Tuple
from sqlalchemy import func
from sqlalchemy.orm import Session

from models import JobSkill, SessionLocal, Skill

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("nextskill.migrations.dedupe_skills")


def merge_duplicate_skills(db: Session = None) -> int:
    """Merges case-variant duplicate skills into single canonical rows.
    Uses set-based database operations to eliminate N+1 queries and prevent lockups."""
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    start_time = time.time()

    try:
        # 1. Identify case-variant names with duplicates via SQL
        logger.info("Scanning database for case-variant duplicate skills...")
        duplicate_groups: List[Tuple[str, int]] = (
            db.query(func.lower(Skill.name), func.count(Skill.id))
            .group_by(func.lower(Skill.name))
            .having(func.count(Skill.id) > 1)
            .all()
        )

        if not duplicate_groups:
            logger.info("No duplicate skill entries found. Database is clean.")
            return 0

        logger.info(f"Found {len(duplicate_groups)} skill groups with duplicates to resolve.")
        merged_count = 0

        for lower_name, _ in duplicate_groups:
            # Fetch all matching Skill rows ordered by ID (keeping earliest as primary)
            skills = (
                db.query(Skill)
                .filter(func.lower(Skill.name) == lower_name)
                .order_by(Skill.id.asc())
                .all()
            )

            primary_skill = skills[0]
            duplicate_skills = skills[1:]
            duplicate_ids = [s.id for s in duplicate_skills]

            # 2. Delete redundant JobSkill records where primary skill ALREADY exists for that job
            # Subquery finds all job_ids already linked to primary_skill
            existing_primary_jobs = (
                db.query(JobSkill.job_id)
                .filter(JobSkill.skill_id == primary_skill.id)
            )

            db.query(JobSkill).filter(
                JobSkill.skill_id.in_(duplicate_ids),
                JobSkill.job_id.in_(existing_primary_jobs)
            ).delete(synchronize_session=False)

            # 3. Re-assign remaining JobSkill records to primary_skill
            db.query(JobSkill).filter(
                JobSkill.skill_id.in_(duplicate_ids)
            ).update(
                {JobSkill.skill_id: primary_skill.id},
                synchronize_session=False
            )

            # 4. Delete the duplicate Skill rows
            db.query(Skill).filter(
                Skill.id.in_(duplicate_ids)
            ).delete(synchronize_session=False)

            merged_count += len(duplicate_ids)

        db.commit()
        elapsed = time.time() - start_time
        logger.info(
            f"Successfully merged {merged_count} duplicate skill entries "
            f"across {len(duplicate_groups)} groups in {elapsed:.2f} seconds."
        )
        return merged_count

    except Exception as exc:
        db.rollback()
        logger.error(f"Critical error during skill deduplication: {exc}")
        raise exc
    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    merge_duplicate_skills()