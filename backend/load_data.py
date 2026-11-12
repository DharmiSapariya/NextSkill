"""Normalize and persist a provider batch in a single PostgreSQL transaction."""
from collections import Counter
from datetime import datetime, timezone
from hashlib import sha256
import json
import os

from sqlalchemy import func, select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import joinedload

from extract_languages import (
    SUPPLEMENTARY_SKILLS_CASE_INSENSITIVE, SUPPLEMENTARY_SKILLS_CASE_SENSITIVE,
    _compile_skill_regex,
)
from ingestion_batch import SourceBatch
from job_normalization import normalize_record
from models import Company, IngestionRun, Job, JobObservation, JobSkill, SessionLocal, Skill

INPUT_FILE = os.getenv("ADZUNA_INPUT_FILE", "raw_jobs_adzuna.json")
INGESTION_WRITE_LOCK = 635096718
SKILL_PATTERNS = {
    name: _compile_skill_regex(name, case_sensitive=name in SUPPLEMENTARY_SKILLS_CASE_SENSITIVE)
    for name in SUPPLEMENTARY_SKILLS_CASE_INSENSITIVE + SUPPLEMENTARY_SKILLS_CASE_SENSITIVE
}
JOB_FIELDS = ("title", "location", "description", "category", "geography", "market_city",
              "experience_band", "salary_min", "salary_max")
OBSERVATION_FIELDS = ("source_url", "location_evidence", "contract_type", "contract_time", "posted_date")


def _source_key(source, source_id):
    return f"{source}:{sha256(source_id.encode()).hexdigest()}"


def record_run(db, source, country, started_at, status, metrics):
    db.add(IngestionRun(
        source=source, requested_country=country, started_at=started_at,
        finished_at=datetime.now(timezone.utc), status=status, metrics=dict(metrics),
    ))


def _refresh_skills(db, jobs):
    if not jobs:
        return 0
    db.flush()
    names = {name.casefold() for name in SKILL_PATTERNS}
    existing = db.scalars(select(Skill).where(func.lower(Skill.name).in_(names)).order_by(Skill.id)).all()
    skill_ids = {}
    for skill in existing:
        skill_ids.setdefault(skill.name.casefold(), skill.id)

    matches = {
        job.id: {name for name, pattern in SKILL_PATTERNS.items() if pattern.search(job.description or "")}
        for job in jobs
    }
    for name in sorted(set().union(*matches.values())):
        normalized = name.casefold()
        if normalized not in skill_ids:
            skill_id = db.execute(
                insert(Skill).values(name=name).on_conflict_do_nothing(index_elements=[Skill.name]).returning(Skill.id)
            ).scalar_one_or_none()
            if skill_id is None:
                skill_id = db.scalar(select(Skill.id).where(Skill.name == name))
            skill_ids[normalized] = skill_id

    managed_ids = [skill.id for skill in existing] + list(skill_ids.values())
    db.query(JobSkill).filter(
        JobSkill.job_id.in_(matches), JobSkill.skill_id.in_(managed_ids),
    ).delete(synchronize_session=False)
    links = [
        {"job_id": job_id, "skill_id": skill_ids[name.casefold()]}
        for job_id, skills in matches.items() for name in sorted(skills)
    ]
    if links:
        db.execute(insert(JobSkill).on_conflict_do_nothing(), links)
    return len(links)


def _persist_records(db, batch, metrics):
    records = {}
    for raw in batch.records:
        record = normalize_record(batch.source, raw)
        if record is None:
            metrics["rejected"] += 1
        elif record["source_id"] in records:
            metrics["duplicates"] += 1
        else:
            records[record["source_id"]] = record

    if not records:
        return
    observations = {
        obs.source_job_id: obs for obs in db.scalars(
            select(JobObservation).options(joinedload(JobObservation.job)).where(
                JobObservation.source == batch.source, JobObservation.source_job_id.in_(records),
            )
        )
    }
    legacy = {
        job.external_id: job for job in db.scalars(
            select(Job).where(Job.source == batch.source, Job.external_id.in_(records))
        )
    }
    fingerprints = {record["identity_fingerprint"] for record in records.values()} - {None}
    canonical = {
        job.identity_fingerprint: job for job in db.scalars(
            select(Job).where(Job.identity_fingerprint.in_(fingerprints))
        )
    }
    company_names = {record["company"] for record in records.values()} - {None}
    companies = {company.name: company for company in db.scalars(
        select(Company).where(Company.name.in_(company_names))
    )}
    dirty_skills = set()

    for source_id, record in records.items():
        fingerprint = record["identity_fingerprint"]
        observation = observations.get(source_id)
        job = observation.job if observation else legacy.get(source_id) or canonical.get(fingerprint)
        if observation and observation.last_observed_at and (
            batch.observed_at is None or batch.observed_at <= observation.last_observed_at
        ):
            metrics["duplicates"] += 1
            continue
        if job is None:
            job = Job(source=batch.source, external_id=_source_key(batch.source, source_id))
            db.add(job)
            metrics["inserted"] += 1
        elif observation or source_id in legacy:
            metrics["updated"] += 1
        else:
            metrics["duplicates"] += 1
            metrics["linked_existing_opportunity"] += 1

        if job.source == batch.source and job.external_id in (source_id, _source_key(batch.source, source_id)):
            if job.id is not None and any(
                getattr(job, field) != record[field]
                for field in ("title", "description", "salary_min", "salary_max")
            ):
                metrics["salary_input_changes"] += 1
            if job.id is None or job.description != record["description"]:
                dirty_skills.add(job)
            for field in JOB_FIELDS:
                setattr(job, field, record[field])
            if job.posted_date is None and record["posted_date"] is not None:
                job.posted_date = record["posted_date"]
            if record["company"]:
                company = companies.get(record["company"])
                if company is None:
                    company = Company(name=record["company"])
                    companies[company.name] = company
                job.company = company
            if job.identity_fingerprint and job.identity_fingerprint != fingerprint:
                if canonical.get(job.identity_fingerprint) is job:
                    del canonical[job.identity_fingerprint]
                job.identity_fingerprint = None
            if fingerprint and canonical.get(fingerprint, job) is job:
                canonical[fingerprint] = job
                job.identity_fingerprint = fingerprint

        if observation is None:
            observation = JobObservation(job=job, source=batch.source, source_job_id=source_id)
            db.add(observation)
        if observation.first_collected_at is None:
            observation.first_collected_at = batch.observed_at
        observation.last_observed_at = batch.observed_at
        observation.requested_country = batch.requested_country
        for field in OBSERVATION_FIELDS:
            if field != "posted_date" or observation.posted_date is None:
                setattr(observation, field, record[field])
    metrics["skill_links"] = _refresh_skills(db, dirty_skills)


def persist_source(batch, started_at, *, historical=False):
    if batch.source not in {"adzuna", "remoteok"}:
        raise ValueError("Unknown ingestion source")
    metrics = Counter(
        fetched=len(batch.records), requests_succeeded=batch.requests_succeeded,
        requests_failed=batch.requests_failed, inserted=0, updated=0, rejected=0,
        duplicates=0, linked_existing_opportunity=0, skill_links=0, salary_input_changes=0,
    )
    with SessionLocal.begin() as db:
        db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": INGESTION_WRITE_LOCK})
        _persist_records(db, batch, metrics)
        status = "historical_import" if historical else (
            "failed" if not batch.requests_succeeded or metrics["rejected"] == metrics["fetched"] > 0
            else "partial" if batch.requests_failed or metrics["rejected"] else "success"
        )
        metrics["duration_seconds"] = round((datetime.now(timezone.utc) - started_at).total_seconds(), 3)
        record_run(db, batch.source, batch.requested_country, started_at, status, metrics)
    return {"status": status, **metrics}


def load_postings(input_file=INPUT_FILE):
    """Import a manual Adzuna snapshot without treating it as a live source refresh."""
    with open(input_file, encoding="utf-8") as handle:
        payload = json.load(handle)
    if payload.get("source", "adzuna") != "adzuna" or not isinstance(payload.get("results"), list):
        raise ValueError("Expected an Adzuna snapshot with a results array")
    # Old snapshots lack trustworthy collection metadata. A file import never
    # advances live source-run status or claims that rows are current.
    batch = SourceBatch("adzuna", None, None, payload["results"], 0, 0)
    result = persist_source(batch, datetime.now(timezone.utc), historical=True)
    return result["inserted"], result["duplicates"] + result["updated"] + result["rejected"]


if __name__ == "__main__":
    print(load_postings())
