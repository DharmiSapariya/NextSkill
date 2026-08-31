import logging
import os
import signal
import sys
import time
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path
from typing import Any

from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_MISSED, JobExecutionEvent
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger

from pipeline import run_full_pipeline

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("scheduler")

# Default cron: 03:00 AM daily
INGESTION_CRON = os.getenv("INGESTION_CRON", "0 3 * * *")
HEALTHCHECK_FILE = Path(os.getenv("HEALTHCHECK_FILE", "/tmp/scheduler_healthy"))


def _isolated_pipeline_runner() -> Any:
    """Executes full pipeline within a separate OS process to guarantee 
    complete RAM reclamation post-execution.
    """
    logger.info("Child process spawned for pipeline execution.")
    return run_full_pipeline()


def run_pipeline_job() -> None:
    """Invokes pipeline run inside a clean process pool to prevent memory leaks."""
    logger.info("Triggering scheduled ingestion pipeline...")
    start_time = time.monotonic()

    # Offload execution to separate OS process for memory isolation
    with ProcessPoolExecutor(max_workers=1) as executor:
        future = executor.submit(_isolated_pipeline_runner)
        try:
            result = future.result()
            elapsed = time.monotonic() - start_time
            logger.info("Pipeline executed successfully in %.2fs: %s", elapsed, result)
        except Exception:
            logger.exception("Pipeline run encountered an unhandled execution error.")
            raise


def _handle_job_listener(event: JobExecutionEvent) -> None:
    """Logs job error and missed events from APScheduler."""
    if event.exception:
        logger.error("Job %s failed with exception: %s", event.job_id, event.exception)
    else:
        logger.warning("Job %s missed execution window.", event.job_id)


def update_healthcheck_heartbeat() -> None:
    """Updates heartbeat timestamp file for Docker/K8s liveness probes."""
    try:
        HEALTHCHECK_FILE.touch(exist_ok=True)
    except OSError as exc:
        logger.warning("Failed to update healthcheck heartbeat file: %s", exc)


def build_scheduler() -> BlockingScheduler:
    """Configures APScheduler with strict concurrency guards and event listeners."""
    scheduler = BlockingScheduler(
        timezone="UTC",
        job_defaults={
            "coalesce": True,          # Roll up missed runs into 1 single run
            "max_instances": 1,        # Strictly prohibit overlapping concurrent runs
            "misfire_grace_time": 3600 # 1 hour grace time
        }
    )

    # Add Ingestion Pipeline Job
    scheduler.add_job(
        run_pipeline_job,
        trigger=CronTrigger.from_crontab(INGESTION_CRON, timezone="UTC"),
        id="ingestion_pipeline",
        replace_existing=True,
    )

    # Add 1-minute Heartbeat Job for Docker/Kubernetes Liveness Probes
    scheduler.add_job(
        update_healthcheck_heartbeat,
        trigger="interval",
        minutes=1,
        id="scheduler_healthcheck",
        replace_existing=True,
    )

    scheduler.add_listener(
        _handle_job_listener, EVENT_JOB_ERROR | EVENT_JOB_MISSED
    )
    return scheduler


def setup_signal_handlers(scheduler: BlockingScheduler) -> None:
    """Handles SIGTERM and SIGINT for container graceful shutdowns."""
    def _graceful_shutdown(signum: int, frame: Any) -> None:
        sig_name = signal.Signals(signum).name
        logger.info("Received signal %s. Initiating graceful scheduler shutdown...", sig_name)
        
        if scheduler.running:
            scheduler.shutdown(wait=True)  # Wait for active pipeline jobs to finish
            
        if HEALTHCHECK_FILE.exists():
            try:
                HEALTHCHECK_FILE.unlink()
            except OSError:
                pass
                
        logger.info("Scheduler shutdown complete. Exiting cleanly.")
        sys.exit(0)

    signal.signal(signal.SIGTERM, _graceful_shutdown)
    signal.signal(signal.SIGINT, _graceful_shutdown)


if __name__ == "__main__":
    logger.info("Starting ingestion scheduler process (Cron: %s)...", INGESTION_CRON)
    
    # Touch healthcheck file on boot
    update_healthcheck_heartbeat()

    scheduler = build_scheduler()
    setup_signal_handlers(scheduler)

    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Scheduler stopped manually.")