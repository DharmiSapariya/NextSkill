"""Schema-level invariant tests — constraints that exist to catch a future bug
before it corrupts data, not to exercise application behavior.
"""
import uuid

import pytest
from sqlalchemy.exc import IntegrityError

from models import Company, Job, JobSkill, Skill, session


def test_company_name_must_be_unique():
    name = f"Constraint Test Co {uuid.uuid4().hex[:12]}"
    session.add(Company(name=name))
    session.commit()

    session.add(Company(name=name))
    with pytest.raises(IntegrityError):
        session.commit()
    session.rollback()


def test_job_skills_rejects_duplicate_job_skill_pair():
    job = session.query(Job).first()
    skill = session.query(Skill).first()

    # Clear out any pre-existing pairing so this test doesn't depend on
    # what fixture data happens to already have loaded.
    session.query(JobSkill).filter_by(job_id=job.id, skill_id=skill.id).delete()
    session.commit()

    session.add(JobSkill(job_id=job.id, skill_id=skill.id))
    session.commit()

    session.add(JobSkill(job_id=job.id, skill_id=skill.id))
    with pytest.raises(IntegrityError):
        session.commit()
    session.rollback()
