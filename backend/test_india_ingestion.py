"""Fixture-driven provider and PostgreSQL ingestion regression tests."""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import httpx
import pytest
from sqlalchemy import select

import fetch_adzuna
import fetch_jobs
import load_data
import pipeline
from india_market_report import market_report
from ingestion_batch import SourceBatch
from job_normalization import normalize_record
from models import IngestionRun, Job, JobObservation, SessionLocal


def adzuna(source_id, **fields):
    return {"id": source_id, "title": "Fresher Developer", "description": "Python and Git",
            "company": {"display_name": "Example employer"}, "created": "2026-07-04T09:00:00Z",
            "location": {"area": ["India", "Karnataka", "Bengaluru"], "display_name": "Bengaluru"},
            **fields}


def remote(source_id, **fields):
    return {"id": source_id, "position": "Junior Developer", "location": "Worldwide",
            "company": "Example employer", "date": "2026-07-04T09:00:00Z",
            "url": f"https://remoteok.com/remote-jobs/{source_id}", **fields}


@pytest.mark.parametrize(("location", "expected"), [
    ("India", "india_eligible_remote"), ("Worldwide", "india_eligible_remote"),
    ("United States", "international_only_remote"), ("US, India", "unknown"),
    ("Remote", "unknown"), ("Bengaluru", "unknown"), (None, "unknown"),
])
def test_remote_eligibility(location, expected):
    assert normalize_record("remoteok", remote("geo", location=location))["geography"] == expected


def test_adzuna_geography_and_missing_values():
    india = normalize_record("adzuna", adzuna("geo", created=None, salary_min=0, salary_max=50))
    assert (india["geography"], india["market_city"], india["experience_band"]) == (
        "india_based", "Bengaluru", "fresher")
    assert (india["posted_date"], india["salary_min"], india["salary_max"]) == (None, None, None)
    unstructured = adzuna("geo", title="Intern in Bengaluru", location={"display_name": "Bengaluru"})
    record = normalize_record("adzuna", unstructured)
    assert (record["geography"], record["experience_band"]) == ("unknown", "internship")
    assert normalize_record("adzuna", adzuna("geo", title="Senior WFH Developer"))["geography"] == "unknown"
    assert normalize_record("adzuna", adzuna("geo", title="Developer"))["experience_band"] == "unknown"


def test_adzuna_requested_country_and_page_status(monkeypatch):
    requests = []
    client = httpx.AsyncClient

    def respond(request):
        requests.append(request.url.path)
        if request.url.path.endswith("/1"):
            return httpx.Response(200, json={"results": []})
        return httpx.Response(403)

    monkeypatch.setenv("ADZUNA_APP_ID", "fixture-id")
    monkeypatch.setenv("ADZUNA_APP_KEY", "fixture-key")
    monkeypatch.setattr(fetch_adzuna, "SEARCH_TERMS", ["developer"])
    monkeypatch.setattr(fetch_adzuna, "PAGES_PER_TERM", 2)
    monkeypatch.setattr(fetch_adzuna, "ADZUNA_COUNTRY", "in")
    monkeypatch.setattr(fetch_adzuna.httpx, "AsyncClient", lambda: client(transport=httpx.MockTransport(respond)))
    batch = fetch_adzuna.fetch_batch()
    assert sorted(requests) == ["/v1/api/jobs/in/search/1", "/v1/api/jobs/in/search/2"]
    assert (batch.requested_country, batch.requests_succeeded, batch.requests_failed) == ("in", 1, 1)


def test_remoteok_fetch_is_persisted_when_adzuna_fails(monkeypatch):
    source_id = uuid4().hex
    client = httpx.Client
    payload = [{"legal": "credit Remote OK"}, remote(source_id, salary_min=0, salary_max=0)]
    monkeypatch.setattr(fetch_jobs.httpx, "Client", lambda **kwargs: client(
        transport=httpx.MockTransport(lambda request: httpx.Response(200, json=payload)), **kwargs))
    monkeypatch.setenv("REMOTEOK_ENABLED", "true")
    monkeypatch.setattr(pipeline, "fetch_batch", lambda: SourceBatch("adzuna", "in", None, [], 0, 1))
    monkeypatch.setattr(pipeline, "invalidate_market_cache", lambda: None)
    result = pipeline.run_full_pipeline()
    assert result["status"] == "partial_failure"
    assert result["sources"]["remoteok"]["inserted"] == 1
    with SessionLocal() as db:
        obs = db.scalar(select(JobObservation).filter_by(source="remoteok", source_job_id=source_id))
        assert obs.last_observed_at is not None
        assert obs.job.salary_min is None
        assert obs.source_url == payload[1]["url"]
        assert db.scalar(select(IngestionRun.status).where(IngestionRun.source == "adzuna")
                         .order_by(IngestionRun.id.desc()).limit(1)) == "failed"


def test_exact_dedup_and_dates_preserve_source_attribution():
    key = uuid4().hex
    start = datetime.now(timezone.utc) - timedelta(days=2)
    row = remote(key, location="Remote", position="Developer", description="Python")
    matching = adzuna(key, title="Developer", location={"display_name": "Remote"}, redirect_url=row["url"])
    another = {**matching, "id": key + "-another", "redirect_url": row["url"] + "-another"}
    first = load_data.persist_source(SourceBatch("remoteok", None, start, [row, row], 1, 0), start)
    assert (first["inserted"], first["duplicates"]) == (1, 1)
    later = start + timedelta(days=1)
    second = load_data.persist_source(SourceBatch("adzuna", "in", later, [matching, another], 1, 0), later)
    assert (second["inserted"], second["linked_existing_opportunity"]) == (1, 1)
    newest = later + timedelta(hours=3)
    load_data.persist_source(SourceBatch("remoteok", None, newest, [{**row, "date": None}], 1, 0), newest)
    load_data.persist_source(SourceBatch("remoteok", None, start, [row], 1, 0), start)
    with SessionLocal() as db:
        by_source = {obs.source: obs for obs in db.scalars(select(JobObservation).filter_by(source_job_id=key))}
        assert by_source["remoteok"].job_id == by_source["adzuna"].job_id
        assert by_source["adzuna"].requested_country == "in"
        assert by_source["remoteok"].first_collected_at == start
        assert by_source["remoteok"].last_observed_at == newest
        assert by_source["remoteok"].posted_date.isoformat() == "2026-07-04"
        assert by_source["remoteok"].expires_at is None
        assert db.scalar(select(JobObservation.job_id).filter_by(source_job_id=key + "-another")) != by_source["remoteok"].job_id


def test_freshness_geography_and_skill_cohort():
    now = datetime.now(timezone.utc)
    key = uuid4().hex
    with SessionLocal() as db:
        before = market_report(db, now, ["india_based"])
    live = adzuna(key)
    stale = adzuna(key + "-stale", description="Python")
    unknown = adzuna(key + "-unknown", location=None, description="Python")
    for observed_at, rows in [(now - timedelta(days=1), [live, unknown]), (now - timedelta(days=31), [stale])]:
        load_data.persist_source(SourceBatch("adzuna", "in", observed_at, rows, 1, 0), now)
    with SessionLocal() as db:
        after = market_report(db, now, ["india_based"])
    assert after["india_city_coverage"]["Bengaluru"]["recently_observed"] == before["india_city_coverage"]["Bengaluru"]["recently_observed"] + 1
    assert after["coverage"]["india_based"]["stale_or_expired"] == before["coverage"]["india_based"]["stale_or_expired"] + 1
    assert after["skill_demand"]["opportunities"] == before["skill_demand"]["opportunities"] + 1
    counts = lambda report: {row["skill"]: row["opportunities"] for row in report["skill_demand"]["skills"]}
    assert counts(after)["python"] == counts(before).get("python", 0) + 1


def test_partial_batch_and_transaction_rollback(monkeypatch):
    now = datetime.now(timezone.utc)
    key = uuid4().hex
    partial = SourceBatch("adzuna", "in", now, [adzuna(key), {}], 1, 1)
    result = load_data.persist_source(partial, now)
    assert (result["status"], result["rejected"], result["inserted"]) == ("partial", 1, 1)
    failed_key = uuid4().hex
    failed = SourceBatch("adzuna", "in", now, [adzuna(failed_key, title=failed_key)], 1, 0)

    def crash(db, jobs):
        db.flush()
        raise RuntimeError("fixture failure")

    monkeypatch.setattr(load_data, "_refresh_skills", crash)
    result = pipeline._run_source("adzuna", "in", lambda: failed)
    assert result["status"] == "failed"
    with SessionLocal() as db:
        assert db.scalar(select(Job.id).filter_by(title=failed_key)) is None
        assert db.scalar(select(JobObservation.id).filter_by(source_job_id=failed_key)) is None
        assert db.scalar(select(IngestionRun.status).where(IngestionRun.source == "adzuna")
                         .order_by(IngestionRun.id.desc()).limit(1)) == "failed"


def test_jobs_api_geography_and_observations():
    from fastapi.testclient import TestClient
    from api import app

    now = datetime.now(timezone.utc)
    key = uuid4().hex
    row = remote(key, position=f"Junior Developer {key}")
    load_data.persist_source(SourceBatch("remoteok", None, now, [row], 1, 0), now)
    with TestClient(app) as client:
        params = {"role": key, "geography": "india_eligible_remote", "fresh_only": True}
        result = client.get("/jobs", params=params)
        assert result.status_code == 200
        data = result.json()
        assert data["total"] == 1
        assert data["market_metadata"]["collection_timestamp"] is not None
        listing = data["results"][0]
        assert listing["remoteok_url"] == row["url"]
        detail = client.get(f"/jobs/{listing['id']}").json()
        assert detail["source_observations"][0]["source_url"] == row["url"]
        assert detail["source_observations"][0]["expires_at"] is None
        result = client.get("/jobs", params={**params, "geography": "india_based"})
        assert result.json()["total"] == 0
