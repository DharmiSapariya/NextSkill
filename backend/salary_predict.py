from datetime import date
import json
import logging
import os
import pickle
import threading
from typing import Any, Dict, List, Optional
import anyio
import joblib
import numpy as np

from role_matcher import resolve_role
from market_metadata import POSTING_AGE_NOTICE_DAYS, older_than_notice

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nextskill.ai.salary_inference")

MODEL_DIR = "model_artifacts"
MODEL_PATH = os.path.join(MODEL_DIR, "salary_model.joblib")
FEATURES_PATH = os.path.join(MODEL_DIR, "salary_model_features.json")

# Module-level cache state — a thread-safe, atomically hot-reloading in-memory
# copy of the on-disk model artifacts, invalidated by the model file's mtime.
_model: Optional[Any] = None
_features: Dict[str, Any] = {}
_loaded_mtime: Optional[float] = None
_reload_lock = threading.Lock()


def _should_reload() -> bool:
    """Checks if artifact files exist and have been modified since last load."""
    if not (os.path.exists(MODEL_PATH) and os.path.exists(FEATURES_PATH)):
        return False
    try:
        current_mtime = os.path.getmtime(MODEL_PATH)
        return _model is None or current_mtime != _loaded_mtime
    except OSError:
        return False


def _load() -> None:
    """Thread-safe atomic reload of model weights and feature metadata."""
    global _model, _features, _loaded_mtime

    if not _should_reload():
        return

    with _reload_lock:
        if not _should_reload():
            return

        try:
            current_mtime = os.path.getmtime(MODEL_PATH)
            logger.info(f"Loading updated salary model artifacts (mtime: {current_mtime})...")

            # Atomically deserialize model weights and json schema
            temp_model = joblib.load(MODEL_PATH)
            with open(FEATURES_PATH, "r") as f:
                temp_features = json.load(f)

            _model = temp_model
            _features = temp_features
            _loaded_mtime = current_mtime
            logger.info("Salary model artifacts loaded successfully.")
        except (EOFError, pickle.UnpicklingError, ValueError, OSError) as exc:
            logger.error(
                f"Failed to load salary model artifacts due to partial write or corruption: {exc}. "
                "Retaining existing in-memory model."
            )


def _get_role_bucket(target_role: str, role_buckets: List[str]) -> str:
    """Maps free-text or resolved roles to feature matrix role buckets."""
    # Step 1: Semantic resolution pass
    resolved_dict = resolve_role(target_role)
    resolved_name = resolved_dict.get("resolved", target_role).lower()

    # Step 2: Bucket match
    for role in role_buckets[:-1]:  # Exclude 'other'
        if role in resolved_name or resolved_name in role:
            return role

    return "other"


def predict_salary(skills: List[str], target_role: str) -> Optional[Dict[str, Any]]:
    """Synchronous public entrypoint for salary prediction."""
    _load()
    if _model is None or not _features:
        return None

    skills_lower = {s.strip().lower() for s in skills if s}
    top_skills: List[str] = _features.get("top_skills", [])
    role_buckets: List[str] = _features.get("role_buckets", [])
    is_log_transformed: bool = _features.get("log_transformed", False)

    # 1. Construct feature vector
    skill_row = [1 if skill.lower() in skills_lower else 0 for skill in top_skills]
    matched_bucket = _get_role_bucket(target_role, role_buckets)
    role_row = [1 if r == matched_bucket else 0 for r in role_buckets]

    X = np.array([skill_row + role_row], dtype=np.float32)

    # 2. Vectorized Tree Estimator Predictions
    if hasattr(_model, "estimators_"):
        # Random Forest / Extra Trees ensemble
        tree_preds = np.array([tree.predict(X)[0] for tree in _model.estimators_])
    else:
        # Single Regressor Fallback
        pred_val = _model.predict(X)[0]
        tree_preds = np.array([pred_val * 0.85, pred_val, pred_val * 1.15])

    # 3. Log-Transform Inversion (if target variable was trained as log(salary))
    if is_log_transformed:
        tree_preds = np.expm1(tree_preds)

    # 4. Compute monotonic percentiles
    low, mid, high = np.percentile(tree_preds, [25, 50, 75])

    provenance = getattr(_model, "nextskill_salary_metadata_", {})
    role_counts = provenance.get("role_observation_counts")
    latest_date = provenance.get("latest_posted_date")
    return {
        "estimate_metadata": {
            "currency": None,
            "pay_period": None,
            "collection_timestamp": None,
            "location_adjusted": False,
            "experience_adjusted": False,
            "observation_count": provenance.get("observation_count"),
            "role_observation_count": role_counts.get(matched_bucket, 0) if role_counts is not None else None,
            "sources": provenance.get("sources"),
            "latest_posted_date": latest_date,
            "posting_age_notice_days": POSTING_AGE_NOTICE_DAYS,
            "latest_posting_older_than_notice": older_than_notice(date.fromisoformat(latest_date) if latest_date else None),
            "trained_on": provenance.get("trained_on"),
            "trained_at": provenance.get("trained_at"),
            "methodology": "Random forest using job-title role buckets and posting skills, trained on salary-range midpoints. The range uses tree prediction quartiles, which do not establish a statistical confidence interval.",
        },
        "target_role": target_role,
        "matched_role_bucket": matched_bucket,
        "predicted_salary_low": int(round(float(low))),
        "predicted_salary_high": int(round(float(high))),
        "predicted_salary_midpoint": int(round(float(mid))),
        "confidence_interval_width": int(round(float(high - low))),
    }


async def predict_salary_async(skills: List[str], target_role: str) -> Optional[Dict[str, Any]]:
    """Async wrapper offloading CPU prediction matrix computations."""
    return await anyio.to_thread.run_sync(predict_salary, skills, target_role)


if __name__ == "__main__":
    # Test suite run
    print("\n--- Salary Prediction Execution Test ---")
    test_skills = ["Python", "SQL", "Docker", "AWS", "PyTorch"]
    test_role = "Senior Data Scientist"

    res = predict_salary(test_skills, test_role)
    if res is None:
        print("Model artifacts not found in 'model_artifacts/'. Run train_salary_model.py first.")
    else:
        print(f"Target Role: {res['target_role']}")
        print(f"Matched Bucket: {res['matched_role_bucket']}")
        print(f"Salary Range: ${res['predicted_salary_low']:,} - ${res['predicted_salary_high']:,}")
        print(f"Midpoint Estimate: ${res['predicted_salary_midpoint']:,}")
