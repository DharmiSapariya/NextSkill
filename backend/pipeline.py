import logging
import time
from typing import Any, Dict, Optional, Tuple

from fetch_adzuna import fetch_postings as fetch_adzuna
from fetch_jobs import fetch_remoteok_postings as fetch_remoteok
from load_data import load_postings as load_adzuna_postings
from extract_languages import extract_supplementary_skills
from merge_duplicate_skills import merge_duplicate_skills
from train_salary_model import train_model

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("nextskill.orchestrator")


def _run_step(step_name: str, step_func, *args, **kwargs) -> Tuple[bool, Any, float]:
    """Executes a pipeline step safely, recording execution duration and capturing exceptions."""
    start_time = time.time()
    try:
        logger.info(f"Starting pipeline step: [{step_name}]...")
        result = step_func(*args, **kwargs)
        elapsed = time.time() - start_time
        logger.info(f"Completed pipeline step: [{step_name}] in {elapsed:.2f}s")
        return True, result, elapsed
    except Exception as exc:
        elapsed = time.time() - start_time
        logger.error(f"Failed pipeline step: [{step_name}] after {elapsed:.2f}s: {exc}", exc_info=True)
        return False, str(exc), elapsed


def run_full_pipeline() -> Dict[str, Any]:
    """Orchestrates the complete job market data ingestion, extraction, and ML pipeline."""
    pipeline_start = time.time()
    logger.info("==================================================")
    logger.info("Initiating Full Job Market Intelligence Pipeline")
    logger.info("==================================================")

    metrics: Dict[str, Any] = {
        "status": "ok",
        "errors": [],
        "steps": {},
    }

    # Step 1: Fetch Ingestion Sources
    adzuna_success, adzuna_fetched, _ = _run_step("fetch_adzuna", fetch_adzuna)
    remoteok_success, remoteok_fetched, _ = _run_step("fetch_remoteok", fetch_remoteok)

    total_fetched = (
        (adzuna_fetched if adzuna_success and isinstance(adzuna_fetched, int) else 0) +
        (remoteok_fetched if remoteok_success and isinstance(remoteok_fetched, int) else 0)
    )

    metrics["steps"]["ingestion"] = {
        "adzuna_fetched": adzuna_fetched if adzuna_success else None,
        "remoteok_fetched": remoteok_fetched if remoteok_success else None,
        "total_fetched": total_fetched,
    }

    if not adzuna_success and not remoteok_success:
        metrics["status"] = "partial_failure"
        metrics["errors"].append("All ingestion sources failed.")

    # Step 2: Load Data into Database
    inserted, skipped = 0, 0
    if total_fetched > 0 or (adzuna_success and adzuna_fetched):
        load_success, load_result, _ = _run_step("load_database", load_adzuna_postings)
        if load_success and isinstance(load_result, tuple):
            inserted, skipped = load_result
        elif not load_success:
            metrics["status"] = "partial_failure"
            metrics["errors"].append(f"Database load error: {load_result}")

    metrics["steps"]["database_load"] = {
        "inserted": inserted,
        "skipped_duplicates": skipped,
    }

    # Step 3: Skill Extraction
    extract_success, extract_matches, _ = _run_step("extract_skills", extract_supplementary_skills)
    if not extract_success:
        metrics["status"] = "partial_failure"
        metrics["errors"].append(f"Skill extraction error: {extract_matches}")

    metrics["steps"]["skill_extraction"] = {
        "matches_added": extract_matches if extract_success else 0,
    }

    # Step 4: Skill Deduplication
    merge_success, merged_count, _ = _run_step("merge_duplicate_skills", merge_duplicate_skills)
    if not merge_success:
        metrics["status"] = "partial_failure"
        metrics["errors"].append(f"Deduplication error: {merged_count}")

    metrics["steps"]["deduplication"] = {
        "skills_merged": merged_count if merge_success else 0,
    }

    # Step 5: Retrain Salary Model
    model_success, model_result, _ = _run_step("train_salary_model", train_model)
    if not model_success:
        metrics["status"] = "partial_failure"
        metrics["errors"].append(f"Model retraining error: {model_result}")

    metrics["steps"]["salary_model_retrain"] = {
        "result": model_result if model_success else "error",
    }

    total_elapsed = time.time() - pipeline_start
    metrics["total_duration_seconds"] = round(total_elapsed, 2)

    logger.info("==================================================")
    logger.info(
        f"Pipeline Execution Finished in {total_elapsed:.2f}s | Status: {metrics['status']}"
    )
    logger.info("==================================================")

    return metrics


if __name__ == "__main__":
    result = run_full_pipeline()
    print("\nPipeline Result Output:")
    import json
    print(json.dumps(result, indent=2))