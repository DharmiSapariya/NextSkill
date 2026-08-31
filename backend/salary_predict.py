import json
import logging
import os
import threading
from typing import Any, Dict, List, Optional
import anyio
import joblib
import numpy as np

from role_matcher import resolve_role

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nextskill.ai.salary_inference")

MODEL_DIR = "model_artifacts"
MODEL_PATH = os.path.join(MODEL_DIR, "salary_model.joblib")
FEATURES_PATH = os.path.join(MODEL_DIR, "salary_model_features.json")

class SalaryInferenceEngine:
    """Thread-safe, atomic hot-reloading inference engine for salary estimation."""

    _instance: Optional["SalaryInferenceEngine"] = None
    _lock: threading.Lock = threading.Lock()

    def __init__(self) -> None:
        self.model = None
        self.features: Dict[str, Any] = {}
        self.loaded_mtime: Optional[float] = None
        self._reload_lock = threading.Lock()

    @classmethod
    def get_instance(cls) -> "SalaryInferenceEngine":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def _should_reload(self) -> bool:
        """Checks if artifact files exist and have been modified since last load."""
        if not (os.path.exists(MODEL_PATH) and os.path.exists(FEATURES_PATH)):
            return False
        try:
            current_mtime = os.path.getmtime(MODEL_PATH)
            return self.model is None or current_mtime != self.loaded_mtime
        except OSError:
            return False

    def load_artifacts(self) -> None:
        """Thread-safe atomic reload of model weights and feature metadata."""
        if not self._should_reload():
            return

        with self._reload_lock:
            if not self._should_reload():
                return

            try:
                current_mtime = os.path.getmtime(MODEL_PATH)
                logger.info(f"Loading updated salary model artifacts (mtime: {current_mtime})...")

                # Atomically deserialize model weights and json schema
                temp_model = joblib.load(MODEL_PATH)
                with open(FEATURES_PATH, "r") as f:
                    temp_features = json.load(f)

                self.model = temp_model
                self.features = temp_features
                self.loaded_mtime = current_mtime
                logger.info("Salary model artifacts loaded successfully.")
            except (EOFError, UnpicklingError, ValueError, OSError) as exc:
                logger.error(
                    f"Failed to load salary model artifacts due to partial write or corruption: {exc}. "
                    "Retaining existing in-memory model."
                )

    def _get_role_bucket(self, target_role: str, role_buckets: List[str]) -> str:
        """Maps free-text or resolved roles to feature matrix role buckets."""
        # Step 1: Semantic resolution pass
        resolved_dict = resolve_role(target_role)
        resolved_name = resolved_dict.get("resolved", target_role).lower()

        # Step 2: Bucket match
        for role in role_buckets[:-1]:  # Exclude 'other'
            if role in resolved_name or resolved_name in role:
                return role

        return "other"

    def predict(self, skills: List[str], target_role: str) -> Optional[Dict[str, Any]]:
        """Computes salary prediction distribution intervals (Low / Mid / High)."""
        self.load_artifacts()
        if self.model is None or not self.features:
            return None

        skills_lower = {s.strip().lower() for s in skills if s}
        top_skills: List[str] = self.features.get("top_skills", [])
        role_buckets: List[str] = self.features.get("role_buckets", [])
        is_log_transformed: bool = self.features.get("log_transformed", False)

        # 1. Construct feature vector
        skill_row = [1 if skill.lower() in skills_lower else 0 for skill in top_skills]
        matched_bucket = self._get_role_bucket(target_role, role_buckets)
        role_row = [1 if r == matched_bucket else 0 for r in role_buckets]

        X = np.array([skill_row + role_row], dtype=np.float32)

        # 2. Vectorized Tree Estimator Predictions
        if hasattr(self.model, "estimators_"):
            # Random Forest / Extra Trees ensemble
            tree_preds = np.array([tree.predict(X)[0] for tree in self.model.estimators_])
        else:
            # Single Regressor Fallback
            pred_val = self.model.predict(X)[0]
            tree_preds = np.array([pred_val * 0.85, pred_val, pred_val * 1.15])

        # 3. Log-Transform Inversion (if target variable was trained as log(salary))
        if is_log_transformed:
            tree_preds = np.expm1(tree_preds)

        # 4. Compute monotonic percentiles
        low, mid, high = np.percentile(tree_preds, [25, 50, 75])

        return {
            "target_role": target_role,
            "matched_role_bucket": matched_bucket,
            "predicted_salary_low": int(round(float(low))),
            "predicted_salary_high": int(round(float(high))),
            "predicted_salary_midpoint": int(round(float(mid))),
            "confidence_interval_width": int(round(float(high - low))),
        }


def predict_salary(skills: List[str], target_role: str) -> Optional[Dict[str, Any]]:
    """Synchronous public entrypoint for salary prediction."""
    engine = SalaryInferenceEngine.get_instance()
    return engine.predict(skills, target_role)


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