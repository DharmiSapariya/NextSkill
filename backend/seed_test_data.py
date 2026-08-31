"""Database fixture seeder for pytest integration test suites.

Populates deterministic mock entities (Companies, Jobs, Skills, JobSkills) 
to support API tests for resume matching, salary predictions, and role graphs.
"""

import logging
import random
from datetime import date, timedelta
from typing import Any, Dict, List, Optional, Set, Tuple
from sqlalchemy.orm import Session

from models import Base, Company, Job, JobSkill, SessionLocal, Skill, engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nextskill.tests.seed")

# Deterministic base seed fixtures required for baseline tests
BASE_JOBS: List[Dict[str, Any]] = [
    {
        "external_id": "seed-1",
        "title": "Senior Data Scientist",
        "offset_days": 15,
        "skills": ["Python", "SQL", "Docker"],
    },
    {
        "external_id": "seed-2",
        "title": "Backend Software Engineer",
        "offset_days": 10,
        "skills": ["Python", "React", "Node.js"],
    },
]

# Multi-role skill matrices
ROLE_SKILLS: Dict[str, List[str]] = {
    "data scientist": ["Python", "SQL", "Pandas", "scikit-learn", "Machine Learning", "TensorFlow"],
    "data analyst": ["Python", "SQL", "Pandas", "Data Visualization", "Excel"],
    "data engineer": ["Python", "SQL", "Docker", "Kubernetes", "AWS"],
    "machine learning engineer": ["Python", "TensorFlow", "PyTorch", "Docker", "Machine Learning", "AWS"],
    "backend developer": ["Python", "SQL", "Docker", "REST API", "PostgreSQL", "Node.js"],
    "frontend developer": ["React", "JavaScript", "TypeScript", "CSS", "HTML"],
    "full stack developer": ["React", "Node.js", "SQL", "JavaScript", "Docker"],
    "devops engineer": ["Docker", "Kubernetes", "AWS", "Terraform", "CI/CD", "Linux"],
}

SALARY_RANGES: Dict[str, Tuple[int, int]] = {
    "data scientist": (110000, 160000),
    "data analyst": (70000, 100000),
    "data engineer": (115000, 165000),
    "machine learning engineer": (130000, 180000),
    "backend developer": (100000, 145000),
    "frontend developer": (95000, 135000),
    "full stack developer": (100000, 145000),
    "devops engineer": (110000, 155000),
}

POSTINGS_PER_ROLE = 15


def seed_database(db_session: Optional[Session] = None, reset_tables: bool = False) -> int:
    """Populates database fixtures safely and deterministically.
    
    Args:
        db_session: Optional SQLAlchemy session. If None, manages its own session lifecycle.
        reset_tables: If True, drops and recreates schema before seeding.
        
    Returns:
        int: Total number of seeded job postings.
    """
    close_on_exit = False
    if db_session is None:
        db_session = SessionLocal()
        close_on_exit = True

    # Isolated Local PRNG to eliminate parallel test runner contamination
    rng = random.Random(42)
    today = date.today()

    try:
        if reset_tables:
            Base.metadata.drop_all(bind=engine)
            Base.metadata.create_all(bind=engine)

        if db_session.query(Job).count() > 0:
            logger.info("Data already present in database, skipping seed.")
            return 0

        # 1. Company Initialization
        acme = Company(name="Acme Corp")
        db_session.add(acme)
        db_session.flush()  # Single flush to retrieve generated company.id

        # 2. Skill Pre-cache & Pre-population
        all_skill_names: Set[str] = set()
        for base_job in BASE_JOBS:
            all_skill_names.update(base_job["skills"])
        for skills_list in ROLE_SKILLS.values():
            all_skill_names.update(skills_list)

        skill_cache: Dict[str, Skill] = {}
        for skill_name in all_skill_names:
            skill_obj = db_session.query(Skill).filter_by(name=skill_name).first()
            if not skill_obj:
                skill_obj = Skill(name=skill_name)
                db_session.add(skill_obj)
            skill_cache[skill_name] = skill_obj

        db_session.flush()

        # 3. Process Base Job Fixtures
        job_objects: List[Job] = []
        job_skill_links: List[Tuple[Job, List[str]]] = []

        for job_data in BASE_JOBS:
            posted_date = today - timedelta(days=job_data.get("offset_days", 10))
            job = Job(
                external_id=job_data["external_id"],
                title=job_data["title"],
                company_id=acme.id,
                location="Remote",
                description=f"Seed fixture posting: {job_data['title']}.",
                category="IT Jobs",
                source="seed",
                posted_date=posted_date,
            )
            job_objects.append(job)
            job_skill_links.append((job, job_data["skills"]))

        # 4. Process Multi-Role Job Fixtures
        job_count = len(BASE_JOBS)
        for role, skills in ROLE_SKILLS.items():
            low, high = SALARY_RANGES[role]
            for i in range(POSTINGS_PER_ROLE):
                job_count += 1
                salary_mid = rng.randint(low, high)
                posted_date = today - timedelta(days=rng.randint(1, 30))

                job = Job(
                    external_id=f"seed-role-{job_count}",
                    title=f"{role.title()} {i}",
                    company_id=acme.id,
                    location="Remote",
                    description=f"Seed fixture posting for {role}.",
                    category="IT Jobs",
                    source="seed",
                    posted_date=posted_date,
                    salary_min=salary_mid - 8000,
                    salary_max=salary_mid + 8000,
                )
                job_objects.append(job)

                sample_size = rng.randint(3, len(skills))
                chosen_skills = rng.sample(skills, k=sample_size)
                job_skill_links.append((job, chosen_skills))

        # 5. Bulk Persistence
        db_session.add_all(job_objects)
        db_session.flush()  # Primary keys generated for all jobs in single roundtrip

        job_skill_objects: List[JobSkill] = []
        for job, skill_names in job_skill_links:
            for skill_name in skill_names:
                skill = skill_cache[skill_name]
                job_skill_objects.append(JobSkill(job_id=job.id, skill_id=skill.id))

        db_session.add_all(job_skill_objects)
        db_session.commit()

        logger.info(f"Seeded {job_count} jobs ({len(BASE_JOBS)} base + {job_count - len(BASE_JOBS)} multi-role).")
        return job_count

    except Exception:
        db_session.rollback()
        logger.exception("Failed to seed test database fixture.")
        raise
    finally:
        if close_on_exit:
            db_session.close()


if __name__ == "__main__":
    Base.metadata.create_all(engine)
    seed_database()