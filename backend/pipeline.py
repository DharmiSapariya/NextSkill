"""Fetch and commit each source independently, then refresh derived artifacts."""
from datetime import datetime, timezone
import json
import logging
import os

from sqlalchemy import text

from cache import invalidate_market_cache
from fetch_adzuna import ADZUNA_COUNTRY, SUPPORTED_COUNTRIES, fetch_batch
from fetch_jobs import fetch_remoteok_batch
from load_data import persist_source, record_run
from models import SessionLocal, engine
from train_salary_model import train_model

logger = logging.getLogger("nextskill.pipeline")
PIPELINE_LOCK = 635096717


def _run_source(source, country, fetch):
    started = datetime.now(timezone.utc)
    try:
        batch = fetch()
        if batch is not None:
            result = persist_source(batch, started)
            logger.log(logging.INFO if result["status"] == "success" else logging.WARNING,
                       "Source %s: %s", source, result)
            return result
        result = {"status": "skipped", "reason": "disabled or credentials unavailable"}
    except Exception as exc:
        # Provider URLs and SQL parameters can contain credentials or raw data.
        result = {"status": "failed", "error_type": type(exc).__name__}
        logger.error("Source %s failed (%s)", source, result["error_type"])

    result["duration_seconds"] = round((datetime.now(timezone.utc) - started).total_seconds(), 3)
    with SessionLocal.begin() as db:
        record_run(db, source, country, started, result["status"], result)
    return result


def _run_sources():
    results = {
        "adzuna": _run_source("adzuna", ADZUNA_COUNTRY if ADZUNA_COUNTRY in SUPPORTED_COUNTRIES else None, fetch_batch),
        "remoteok": _run_source(
            "remoteok", None, fetch_remoteok_batch
            if os.getenv("REMOTEOK_ENABLED", "false").lower() == "true" else lambda: None,
        ),
    }
    statuses = {result["status"] for result in results.values()}
    status = "success"
    if statuses == {"skipped"}:
        status = "skipped"
    elif statuses <= {"failed", "skipped"}:
        status = "failed"
    elif statuses & {"failed", "partial"}:
        status = "partial_failure"

    changed = any(
        row.get("inserted") or row.get("updated") or row.get("linked_existing_opportunity")
        for row in results.values()
    )
    if changed:
        invalidate_market_cache()
    salary = {"status": "skipped", "reason": "no Adzuna postings changed"}
    if results["adzuna"].get("inserted") or results["adzuna"].get("salary_input_changes"):
        try:
            salary = train_model()
        except Exception as exc:
            salary = {"status": "failed", "error_type": type(exc).__name__}
            logger.error("Salary retraining failed (%s)", salary["error_type"])
            status = "partial_failure"
    return {"status": status, "sources": results, "salary_model_retrain": salary}


def run_full_pipeline():
    # The scheduler's max_instances only protects one process. Keep this
    # session-level lock across network calls and both source commits.
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as connection:
        params = {"key": PIPELINE_LOCK}
        if not connection.scalar(text("SELECT pg_try_advisory_lock(:key)"), params):
            return {"status": "skipped", "reason": "another ingestion is running"}
        try:
            return _run_sources()
        finally:
            connection.execute(text("SELECT pg_advisory_unlock(:key)"), params)


if __name__ == "__main__":
    result = run_full_pipeline()
    print(json.dumps(result, indent=2))
    raise SystemExit(int(result["status"] in {"failed", "partial_failure"}))
