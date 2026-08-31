"""Offline training script for the salary prediction model.

Trains an interpretable RandomForest regression pipeline using skill set
co-occurrences and normalized role buckets. Can be invoked directly as a CLI
script or programmatically via pipeline.py orchestration ticks.
"""

import json
import os
from collections import Counter
from typing import Any, Dict, List, Set, Tuple

import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split

from models import Job, JobSkill, SessionLocal, Skill

MODEL_DIR = "model_artifacts"
TOP_N_SKILLS = 100

ROLE_BUCKETS: List[str] = [
    "software engineer", "backend developer", "frontend developer", "full stack developer",
    "data scientist", "data analyst", "data engineer", "machine learning engineer",
    "ai engineer", "devops engineer", "cloud engineer", "site reliability engineer",
    "mobile developer", "android developer", "ios developer", "qa engineer",
    "test automation engineer", "cybersecurity analyst", "database administrator",
    "product manager", "ui ux designer",
]


def _role_bucket(title: str) -> str:
    title_lower = title.lower() if title else ""
    for role in ROLE_BUCKETS:
        if role in title_lower:
            return role
    return "other"


def build_dataset() -> Tuple[np.ndarray, np.ndarray, List[str], List[str]]:
    """Extracts job posting salaries, maps roles, and builds multi-hot skill feature matrices."""
    session = SessionLocal()
    try:
        # Retrieve salary-labeled jobs joining skills in a single efficient query
        query_results = (
            session.query(
                Job.id,
                Job.title,
                Job.salary_min,
                Job.salary_max,
                Skill.name.label("skill_name"),
            )
            .outerjoin(JobSkill, Job.id == JobSkill.job_id)
            .outerjoin(Skill, Skill.id == JobSkill.skill_id)
            .filter(Job.salary_min.isnot(None))
            .filter(Job.salary_max.isnot(None))
            .all()
        )

        if not query_results:
            return np.array([]), np.array([]), [], []

        job_salaries: Dict[int, float] = {}
        job_roles: Dict[int, str] = {}
        job_skills: Dict[int, Set[str]] = {}

        for job_id, title, sal_min, sal_max, skill_name in query_results:
            if job_id not in job_salaries:
                job_salaries[job_id] = float((sal_min + sal_max) / 2)
                job_roles[job_id] = _role_bucket(title)
                job_skills[job_id] = set()
            if skill_name:
                job_skills[job_id].add(skill_name)

        # Determine Top N skills across all valid salary-labeled postings
        skill_counts = Counter(name for skills in job_skills.values() for name in skills)
        top_skills = [name for name, _ in skill_counts.most_common(TOP_N_SKILLS)]

        X, y, roles = [], [], []
        for job_id, salary_midpoint in job_salaries.items():
            skills = job_skills.get(job_id, set())
            X.append([1 if skill in skills else 0 for skill in top_skills])
            y.append(salary_midpoint)
            roles.append(job_roles[job_id])

        return np.array(X), np.array(y), roles, top_skills
    finally:
        session.close()


def train_model() -> Dict[str, Any]:
    """Trains a Random Forest regressor on salary-labeled posting features.

    Returns:
        Dict detailing training metrics or skip status.
    """
    X, y, roles, top_skills = build_dataset()

    if len(X) < 30:
        return {"status": "skipped", "reason": f"only {len(X)} salary-labeled postings, need at least 30"}

    role_buckets_with_other = ROLE_BUCKETS + ["other"]
    role_dummies = np.array([[1 if r == role else 0 for role in role_buckets_with_other] for r in roles])
    
    # Horizontally stack skill multi-hot encodings with one-hot encoded role dummies
    X_full = np.hstack([X, role_dummies])

    X_train, X_test, y_train, y_test = train_test_split(X_full, y, test_size=0.2, random_state=42)

    model = RandomForestRegressor(n_estimators=200, max_depth=8, random_state=42)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(model, os.path.join(MODEL_DIR, "salary_model.joblib"))
    
    metadata_path = os.path.join(MODEL_DIR, "salary_model_features.json")
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump({"top_skills": top_skills, "role_buckets": role_buckets_with_other}, f, indent=2)

    return {
        "status": "trained",
        "trained_on": len(X_train),
        "tested_on": len(X_test),
        "mae": round(float(mae), 2),
    }


if __name__ == "__main__":
    result = train_model()
    if result["status"] == "trained":
        print(f"Trained on {result['trained_on']} rows, tested on {result['tested_on']}. MAE: ${result['mae']:,.0f}")
        print(f"Saved model to {MODEL_DIR}/salary_model.joblib")
    else:
        print(result["reason"])