"""Tests for the ingestion pipeline orchestration (pipeline.py, scheduler.py,
and fetch/load/extract/merge modules).

Verifies credential safety, pipeline retraining triggers, load idempotency,
skill deduplication, and scheduler job definitions without side effects.
"""

import json
import uuid
from datetime import datetime, timezone
from typing import Generator
import pytest

import pipeline
from fetch_adzuna import fetch_postings
from load_data import load_postings
from merge_duplicate_skills import merge_duplicate_skills
from ingestion_batch import SourceBatch
from models import Job, JobObservation, JobSkill, SessionLocal, Skill
from pipeline import run_full_pipeline


@pytest.fixture
def db_session() -> Generator:
    """Provides a transactional database session rolled back post-test execution."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def sample_job(db_session) -> Job:
    """Factory fixture to supply an isolated job record for skill merge testing."""
    job = Job(
        external_id=f"test-job-{uuid.uuid4().hex[:8]}",
        title="Test Engineer",
        company_id=None,
        source="test",
    )
    db_session.add(job)
    db_session.flush()
    return job


# --- Pipeline & Credential Isolation Tests ---

def test_fetch_skips_cleanly_without_credentials(monkeypatch):
    """Verifies fetch_postings returns None when API keys are absent."""
    monkeypatch.delenv("ADZUNA_APP_ID", raising=False)
    monkeypatch.delenv("ADZUNA_APP_KEY", raising=False)
    assert fetch_postings() is None


def test_pipeline_reports_skipped_without_credentials(monkeypatch):
    """Verifies orchestration pipeline halts with explicit status when keys are missing."""
    monkeypatch.delenv("ADZUNA_APP_ID", raising=False)
    monkeypatch.delenv("ADZUNA_APP_KEY", raising=False)
    monkeypatch.setenv("REMOTEOK_ENABLED", "false")
    result = run_full_pipeline()
    assert result["status"] == "skipped"
    assert all(source["status"] == "skipped" for source in result["sources"].values())


def test_pipeline_retrains_salary_model_when_new_data_arrives(monkeypatch):
    """Verifies retrain trigger fires only when new postings are successfully ingested."""
    monkeypatch.setenv("REMOTEOK_ENABLED", "false")
    batch = SourceBatch("adzuna", "in", datetime.now(timezone.utc),
                        [{"id": uuid.uuid4().hex, "title": "Fixture Engineer"}], 1, 0)
    monkeypatch.setattr(pipeline, "fetch_batch", lambda: batch)
    monkeypatch.setattr(pipeline, "invalidate_market_cache", lambda: None)

    calls = []
    monkeypatch.setattr(
        pipeline,
        "train_model",
        lambda: calls.append(1) or {"status": "trained", "trained_on": 1},
    )

    result = pipeline.run_full_pipeline()
    assert len(calls) == 1
    assert result["salary_model_retrain"] == {"status": "trained", "trained_on": 1}


# --- Data Load & Invariant Tests ---

def test_load_postings_is_idempotent(tmp_path, db_session):
    """Ensures duplicate ingestions skip existing records without causing duplicates."""
    external_id = f"pipeline-test-{uuid.uuid4().hex[:12]}"
    fixture = {
        "results": [
            {
                "id": external_id,
                "title": "Pipeline Test Engineer",
                "company": {"display_name": "Pipeline Test Co"},
                "location": {"display_name": "Remote"},
                "description": "A fixture posting for pipeline tests.",
                "category": {"label": "IT Jobs"},
                "created": "2026-07-01T00:00:00Z",
                "salary_min": None,
                "salary_max": None,
            }
        ]
    }
    fixture_file = tmp_path / "raw_jobs_adzuna.json"
    fixture_file.write_text(json.dumps(fixture))

    inserted, skipped = load_postings(str(fixture_file))
    assert inserted == 1
    assert skipped == 0

    # Second load attempt on identical data payload
    inserted_again, skipped_again = load_postings(str(fixture_file))
    assert inserted_again == 0
    assert skipped_again == 1

    observation = db_session.query(JobObservation).filter_by(source_job_id=external_id).one()
    assert observation.last_observed_at is None
    assert observation.job.title == "Pipeline Test Engineer"


def test_merge_duplicate_skills_consolidates_case_variants(db_session, sample_job):
    """Verifies case-insensitive skill merging maps all job links to a single canonical skill."""
    base_name = f"pipeline-test-skill-{uuid.uuid4().hex[:12]}"
    lower = Skill(name=base_name)
    upper = Skill(name=base_name.upper())
    db_session.add_all([lower, upper])
    db_session.flush()

    db_session.add(JobSkill(job_id=sample_job.id, skill_id=lower.id))
    db_session.add(JobSkill(job_id=sample_job.id, skill_id=upper.id))
    db_session.commit()

    merged = merge_duplicate_skills()
    assert merged >= 1

    remaining = db_session.query(Skill).filter(Skill.name.ilike(base_name)).all()
    assert len(remaining) == 1


# --- Scheduler Initialization Tests ---

def test_scheduler_builds_without_starting():
    """Verifies that the APScheduler instance is properly instantiated with jobs configured."""
    from scheduler import build_scheduler

    scheduler = build_scheduler()
    job_ids = {job.id for job in scheduler.get_jobs()}
    assert job_ids == {"ingestion_pipeline", "scheduler_healthcheck"}