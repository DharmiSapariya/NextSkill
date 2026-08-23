"""Inference for the trained salary model. Import predict_salary() from api.py.

If no model has been trained yet (model_artifacts/ missing — see
train_salary_model.py), predict_salary() returns None so the API can respond
with a clear "not enough data yet" message instead of crashing.
"""
import json
import os

import joblib
import numpy as np

MODEL_DIR = "model_artifacts"
_model = None
_features = None
_loaded_mtime = None


def _load():
    """Reloads whenever the model file's mtime changes, not just once ever.

    train_model() now runs on every scheduled ingestion tick (pipeline.py),
    but the scheduler is a separate long-lived process from the API
    (scheduler.py is explicit about that). Without checking mtime, the API
    process would cache whatever model was loaded on its first prediction
    request and never notice a retrain happened until it was restarted —
    silently serving stale predictions indefinitely.
    """
    global _model, _features, _loaded_mtime
    model_path = f"{MODEL_DIR}/salary_model.joblib"
    features_path = f"{MODEL_DIR}/salary_model_features.json"
    if not (os.path.exists(model_path) and os.path.exists(features_path)):
        return
    current_mtime = os.path.getmtime(model_path)
    if _model is not None and current_mtime == _loaded_mtime:
        return
    _model = joblib.load(model_path)
    with open(features_path) as f:
        _features = json.load(f)
    _loaded_mtime = current_mtime


def _role_bucket(title: str, role_buckets: list[str]) -> str:
    title_lower = title.lower()
    for role in role_buckets[:-1]:  # last entry is always "other"
        if role in title_lower:
            return role
    return "other"


def predict_salary(skills: list[str], target_role: str) -> dict | None:
    _load()
    if _model is None:
        return None

    skills_lower = {s.lower() for s in skills}
    top_skills = _features["top_skills"]
    role_buckets = _features["role_buckets"]

    skill_row = [1 if skill.lower() in skills_lower else 0 for skill in top_skills]
    role = _role_bucket(target_role, role_buckets)
    role_row = [1 if r == role else 0 for r in role_buckets]

    X = np.array([skill_row + role_row])

    # Derive low/mid/high from the same distribution of individual-tree
    # predictions (rather than mixing the forest's mean-based .predict() with
    # a separately computed percentile band) so low <= mid <= high always
    # holds by construction — percentiles of one distribution are monotonic,
    # a mean and percentiles of that same distribution are not guaranteed to
    # agree.
    tree_preds = np.array([tree.predict(X)[0] for tree in _model.estimators_])
    low, mid, high = np.percentile(tree_preds, [25, 50, 75])

    return {
        "target_role": target_role,
        "matched_role_bucket": role,
        "predicted_salary_low": round(float(low)),
        "predicted_salary_high": round(float(high)),
        "predicted_salary_midpoint": round(float(mid)),
    }
