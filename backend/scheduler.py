"""Runs the ingestion pipeline on a schedule instead of someone manually
re-running fetch_adzuna.py / load_data.py / extract_languages.py.

Run standalone (`python scheduler.py`) as a long-lived process — a separate
service in docker-compose.yml, or a separate worker dyno/process in whatever
you deploy to. It is NOT invoked by the API process itself; a scheduled batch
job has no business running inside a request-serving web process.
"""
import logging
import os

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger

from pipeline import run_full_pipeline

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("scheduler")

# Default: once a day at 03:00. Override via env var, e.g. "0 */6 * * *" for every 6 hours.
INGESTION_CRON = os.getenv("INGESTION_CRON", "0 3 * * *")


def run_pipeline_job():
    logger.info("Starting scheduled ingestion pipeline run")
    try:
        result = run_full_pipeline()
        logger.info("Pipeline run finished: %s", result)
    except Exception:
        logger.exception("Pipeline run failed")


def build_scheduler() -> BlockingScheduler:
    scheduler = BlockingScheduler()
    scheduler.add_job(
        run_pipeline_job,
        trigger=CronTrigger.from_crontab(INGESTION_CRON),
        id="ingestion_pipeline",
        misfire_grace_time=3600,
    )
    return scheduler


if __name__ == "__main__":
    logger.info("Ingestion scheduler starting, cron: %s", INGESTION_CRON)
    build_scheduler().start()
