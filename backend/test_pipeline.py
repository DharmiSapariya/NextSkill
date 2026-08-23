"""Tests for the ingestion pipeline orchestration (pipeline.py, scheduler.py,
and the now-importable fetch/load/extract/merge modules).

None of these need real Adzuna credentials — fetch_postings() skipping
cleanly without them is itself one of the things under test.
"""
import json
import os
import uuid

import pytest

import pipeline
from fetch_adzuna import fetch_postings
from load_data import load_postings
from merge_duplicate_skills import merge_duplicate_skills
from models import Job, Skill, JobSkill, session
from pipeline import run_full_pipeline


def test_fetch_skips_cleanly_without_credentials(monkeypatch):
    monkeypatch.delenv("ADZUNA_APP_ID", raising=False)
    monkeypatch.delenv("ADZUNA_APP_KEY", raising=False)
    assert fetch_postings() is None


def test_pipeline_reports_skipped_without_credentials(monkeypatch):
    monkeypatch.delenv("ADZUNA_APP_ID", raising=False)
    monkeypatch.delenv("ADZUNA_APP_KEY", raising=False)
    result = run_full_pipeline()
    assert result == {"status": "skipped", "reason": "ADZUNA_APP_ID / ADZUNA_APP_KEY not set"}


def test_pipeline_retrains_salary_model_when_new_data_arrives(monkeypatch):
    # train_model() used to be a manual-only script — the scheduled pipeline
    # ingested new salary-labeled postings every tick but never retrained on
    # them. Confirm the wiring actually calls it, without needing real
    # Adzuna credentials or a slow real RandomForest fit in this test.
    monkeypatch.setattr(pipeline, "fetch_postings", lambda: 3)
    monkeypatch.setattr(pipeline, "load_postings", lambda: (3, 0))
    monkeypatch.setattr(pipeline, "extract_supplementary_skills", lambda: 2)
    monkeypatch.setattr(pipeline, "merge_duplicate_skills", lambda: 0)

    calls = []
    monkeypatch.setattr(pipeline, "train_model", lambda: calls.append(1) or {"status": "trained", "trained_on": 1})

    result = pipeline.run_full_pipeline()
    assert len(calls) == 1
    assert result["salary_model_retrain"] == {"status": "trained", "trained_on": 1}


def test_load_postings_is_idempotent(tmp_path):
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

    # Second load of the same file should skip, not duplicate.
    inserted_again, skipped_again = load_postings(str(fixture_file))
    assert inserted_again == 0
    assert skipped_again == 1

    job = session.query(Job).filter_by(external_id=external_id).first()
    assert job is not None
    assert job.title == "Pipeline Test Engineer"


def test_merge_duplicate_skills_consolidates_case_variants():
    base_name = f"pipeline-test-skill-{uuid.uuid4().hex[:12]}"
    lower = Skill(name=base_name)
    upper = Skill(name=base_name.upper())
    session.add_all([lower, upper])
    session.commit()

    job = session.query(Job).first()
    session.add(JobSkill(job_id=job.id, skill_id=lower.id))
    session.add(JobSkill(job_id=job.id, skill_id=upper.id))
    session.commit()

    merged = merge_duplicate_skills()
    assert merged >= 1

    remaining = session.query(Skill).filter(Skill.name.ilike(base_name)).all()
    assert len(remaining) == 1


def test_scheduler_builds_without_starting():
    from scheduler import build_scheduler

    # Only checking that the job is configured correctly — never call start()
    # here, BlockingScheduler.start() blocks the calling thread forever, and
    # shutdown() on a scheduler that was never started raises
    # SchedulerNotRunningError, so there's nothing to clean up.
    scheduler = build_scheduler()
    jobs = scheduler.get_jobs()
    assert len(jobs) == 1
    assert jobs[0].id == "ingestion_pipeline"
