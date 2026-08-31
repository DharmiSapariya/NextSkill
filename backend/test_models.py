"""Schema-level invariant tests — constraints that exist to catch a future bug
before it corrupts data, not to exercise application behavior.
"""

import uuid
import pytest
from sqlalchemy.exc import IntegrityError

from models import Company, Job, JobSkill, Skill, SessionLocal


@pytest.fixture
def db_session():
    """Provides a transactional database session rolled back automatically after every test."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def sample_company(db_session):
    """Factory fixture for producing an isolated Company instance."""
    company = Company(name=f"Co-{uuid.uuid4().hex[:12]}")
    db_session.add(company)
    db_session.flush()
    return company


@pytest.fixture
def sample_job(db_session, sample_company):
    """Factory fixture for producing an isolated Job instance linked to a Company."""
    job = Job(
        title=f"Engineer {uuid.uuid4().hex[:8]}",
        company_id=sample_company.id,
        seniority="mid",
    )
    db_session.add(job)
    db_session.flush()
    return job


@pytest.fixture
def sample_skill(db_session):
    """Factory fixture for producing an isolated Skill instance."""
    skill = Skill(name=f"Skill-{uuid.uuid4().hex[:8]}")
    db_session.add(skill)
    db_session.flush()
    return skill


# --- Schema Invariant Tests ---

def test_company_name_must_be_unique(db_session):
    """Verifies that duplicate company names violate unique database constraints."""
    unique_name = f"Constraint Test Co {uuid.uuid4().hex[:12]}"
    
    company1 = Company(name=unique_name)
    db_session.add(company1)
    db_session.commit()

    company2 = Company(name=unique_name)
    db_session.add(company2)

    with pytest.raises(IntegrityError):
        db_session.commit()


def test_job_skills_rejects_duplicate_job_skill_pair(db_session, sample_job, sample_skill):
    """Verifies that duplicate composite primary/foreign key pairs (job_id, skill_id) are rejected."""
    link1 = JobSkill(job_id=sample_job.id, skill_id=sample_skill.id)
    db_session.add(link1)
    db_session.commit()

    link2 = JobSkill(job_id=sample_job.id, skill_id=sample_skill.id)
    db_session.add(link2)

    with pytest.raises(IntegrityError):
        db_session.commit()


def test_job_skills_rejects_nonexistent_foreign_keys(db_session, sample_job, sample_skill):
    """Verifies that foreign key constraints prevent orphan JobSkill mappings."""
    invalid_job_id = 999999999
    orphan_link = JobSkill(job_id=invalid_job_id, skill_id=sample_skill.id)
    db_session.add(orphan_link)

    with pytest.raises(IntegrityError):
        db_session.commit()


def test_company_name_cannot_be_null(db_session):
    """Verifies NOT NULL constraint enforcement on critical schema fields."""
    invalid_company = Company(name=None)
    db_session.add(invalid_company)

    with pytest.raises(IntegrityError):
        db_session.commit()