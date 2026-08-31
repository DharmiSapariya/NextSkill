import logging
import re
import time
from typing import Dict, List, Set, Tuple
from sqlalchemy.orm import Session

from models import Job, JobSkill, Skill, get_db
from skills_taxonomy import TAXONOMY_REGISTRY

# skills_taxonomy.py moved from a flat name list to TAXONOMY_REGISTRY (a
# list of SkillDefinition) — this file only ever needed the canonical
# names, so that's all it takes back out.
SKILLS_TAXONOMY = [skill.canonical_name for skill in TAXONOMY_REGISTRY]

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nextskill.taxonomy_extractor")

BATCH_SIZE = 500

# High-risk short terms requiring strict case sensitivity
CASE_SENSITIVE_SKILLS = {"R", "Go", "IT", "AI", "C"}


def _build_skill_regex(name: str) -> re.Pattern:
    """Builds an accurate regex pattern supporting special characters (+, #, ., -)."""
    escaped = re.escape(name)
    # Lookarounds ensure boundaries against alphanumeric chars and technical symbols
    pattern = rf"(?<![A-Za-z0-9#+.-]){escaped}(?![A-Za-z0-9#+.-])"
    flags = 0 if name in CASE_SENSITIVE_SKILLS else re.IGNORECASE
    return re.compile(pattern, flags)


def extract_skills_from_taxonomy(db: Session):
    start_time = time.time()

    # 1. Ensure all taxonomy skills exist in the DB (Single Query)
    logger.info("Synchronizing taxonomy terms with database...")
    existing_skills = db.query(Skill).filter(Skill.name.in_(SKILLS_TAXONOMY)).all()
    skill_map: Dict[str, Skill] = {s.name: s for s in existing_skills}

    new_skills = [
        Skill(name=name) for name in SKILLS_TAXONOMY if name not in skill_map
    ]
    if new_skills:
        db.add_all(new_skills)
        db.flush()
        for skill in new_skills:
            skill_map[skill.name] = skill
    db.commit()

    # 2. Pre-compile Regex Patterns
    compiled_patterns: List[Tuple[Skill, re.Pattern]] = [
        (skill_map[name], _build_skill_regex(name)) for name in SKILLS_TAXONOMY
    ]

    # 3. Clean existing associations safely
    logger.info("Purging stale JobSkill associations...")
    db.query(JobSkill).delete(synchronize_session=False)
    db.commit()

    # 4. Stream jobs in batches
    total_jobs = db.query(Job).filter(Job.description.isnot(None)).count()
    logger.info(f"Processing taxonomy extraction across {total_jobs} jobs...")

    job_stream = (
        db.query(Job.id, Job.description)
        .filter(Job.description.isnot(None))
        .yield_per(BATCH_SIZE)
    )

    pending_mappings: List[dict] = []
    seen_pairs: Set[Tuple[int, int]] = set()
    total_matches = 0

    for i, (job_id, description) in enumerate(job_stream, 1):
        if not description or not description.strip():
            continue

        for skill, pattern in compiled_patterns:
            if pattern.search(description):
                pair = (job_id, skill.id)
                if pair not in seen_pairs:
                    seen_pairs.add(pair)
                    pending_mappings.append({"job_id": job_id, "skill_id": skill.id})
                    total_matches += 1

        # Periodic Bulk Insertion
        if i % BATCH_SIZE == 0:
            if pending_mappings:
                db.bulk_insert_mappings(JobSkill, pending_mappings)
                pending_mappings.clear()
            db.commit()
            logger.info(f"Processed {i}/{total_jobs} jobs | Matches: {total_matches}")

    # Flush remaining mappings
    if pending_mappings:
        db.bulk_insert_mappings(JobSkill, pending_mappings)
        db.commit()

    elapsed = time.time() - start_time
    logger.info(
        f"Taxonomy extraction completed in {elapsed:.2f} seconds. "
        f"Inserted {total_matches} skill mentions across {total_jobs} jobs."
    )


if __name__ == "__main__":
    from models import SessionLocal
    db_session = SessionLocal()
    try:
        extract_skills_from_taxonomy(db_session)
    finally:
        db_session.close()