import logging
import re
from typing import Dict, Set, Tuple
from sqlalchemy.orm import Session

from models import Job, JobSkill, Skill, get_db

logger = logging.getLogger("nextskill.extractor")

# Separate case-sensitive vs case-insensitive term lists
SUPPLEMENTARY_SKILLS_CASE_INSENSITIVE = [
    "Python", "Java", "JavaScript", "TypeScript", "Rust",
    "Swift", "Kotlin", "PHP", "Ruby", "Scala", "C++", "C#",
    "SQL", "HTML", "CSS", "React", "Docker", "Kubernetes", "AWS",
    "Azure", "GCP", "Git", "Linux", "MongoDB", "PostgreSQL", "MySQL",
]

SUPPLEMENTARY_SKILLS_CASE_SENSITIVE = [
    "R", "Go"
]


def _compile_skill_regex(name: str, case_sensitive: bool = False) -> re.Pattern:
    """Builds a regex pattern that correctly handles special characters (+, #) at boundaries."""
    escaped = re.escape(name)
    # Lookaround rules ensuring we don't match inside larger words or symbols
    pattern = rf"(?<![A-Za-z0-9#+]){escaped}(?![A-Za-z0-9#+])"
    flags = 0 if case_sensitive else re.IGNORECASE
    return re.compile(pattern, flags)


def extract_supplementary_skills(db: Session) -> int:
    """Regex-matches SUPPLEMENTARY_SKILLS against every job description using bulk operations."""
    
    # 1. Pre-fetch / Insert Skills in a single transaction
    all_skill_names = SUPPLEMENTARY_SKILLS_CASE_INSENSITIVE + SUPPLEMENTARY_SKILLS_CASE_SENSITIVE
    existing_skills = db.query(Skill).filter(Skill.name.in_(all_skill_names)).all()
    skill_cache: Dict[str, Skill] = {s.name: s for s in existing_skills}

    for name in all_skill_names:
        if name not in skill_cache:
            skill = Skill(name=name)
            db.add(skill)
            db.flush()
            skill_cache[name] = skill
    db.commit()

    # 2. Pre-compile Regex Patterns
    compiled_patterns = []
    for name in SUPPLEMENTARY_SKILLS_CASE_INSENSITIVE:
        compiled_patterns.append((skill_cache[name], _compile_skill_regex(name, case_sensitive=False)))
    for name in SUPPLEMENTARY_SKILLS_CASE_SENSITIVE:
        compiled_patterns.append((skill_cache[name], _compile_skill_regex(name, case_sensitive=True)))

    # 3. Load all existing (job_id, skill_id) associations into memory in 1 query
    existing_associations: Set[Tuple[int, int]] = set(
        db.query(JobSkill.job_id, JobSkill.skill_id).all()
    )

    # 4. Stream jobs to avoid memory pressure
    jobs = db.query(Job.id, Job.description).filter(Job.description.isnot(None)).all()
    
    new_job_skills = []
    total_matches = 0

    for job_id, description in jobs:
        for skill, pattern in compiled_patterns:
            if pattern.search(description):
                if (job_id, skill.id) not in existing_associations:
                    new_job_skills.append({"job_id": job_id, "skill_id": skill.id})
                    existing_associations.add((job_id, skill.id))
                    total_matches += 1

    # 5. Perform high-speed bulk insertion
    if new_job_skills:
        db.bulk_insert_mappings(JobSkill, new_job_skills)
        db.commit()

    logger.info("Added %d new skill associations across %d jobs", total_matches, len(jobs))
    return total_matches


if __name__ == "__main__":
    from models import SessionLocal
    db_session = SessionLocal()
    try:
        extract_supplementary_skills(db_session)
    finally:
        db_session.close()