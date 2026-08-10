"""Offline training script for the salary prediction model.

Run manually whenever there's enough new salary-labeled data to justify
retraining (Phase 2 turns this into a scheduled job instead of a manual run):

    python train_salary_model.py

Trains a simple, interpretable model: skills (multi-hot, top N most frequent)
plus a role bucket -> salary midpoint. Deliberately not fancy — with a few
thousand postings, a heavier model would just overfit.
"""
import json
import os
from collections import Counter, defaultdict

import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split

from models import Job, JobSkill, Skill, session

MODEL_DIR = "model_artifacts"
TOP_N_SKILLS = 100  # keeps the feature space manageable at this data volume

ROLE_BUCKETS = [
    "software engineer", "backend developer", "frontend developer", "full stack developer",
    "data scientist", "data analyst", "data engineer", "machine learning engineer",
    "ai engineer", "devops engineer", "cloud engineer", "site reliability engineer",
    "mobile developer", "android developer", "ios developer", "qa engineer",
    "test automation engineer", "cybersecurity analyst", "database administrator",
    "product manager", "ui ux designer",
]


def _role_bucket(title: str) -> str:
    title_lower = title.lower()
    for role in ROLE_BUCKETS:
        if role in title_lower:
            return role
    return "other"


def build_dataset():
    jobs = (
        session.query(Job)
        .filter(Job.salary_min.isnot(None))
        .filter(Job.salary_max.isnot(None))
        .all()
    )

    job_skills = defaultdict(set)
    if jobs:
        job_ids = [j.id for j in jobs]
        rows = (
            session.query(JobSkill.job_id, Skill.name)
            .join(Skill, Skill.id == JobSkill.skill_id)
            .filter(JobSkill.job_id.in_(job_ids))
            .all()
        )
        for job_id, skill_name in rows:
            job_skills[job_id].add(skill_name)

    skill_counts = Counter(name for skills in job_skills.values() for name in skills)
    top_skills = [name for name, _ in skill_counts.most_common(TOP_N_SKILLS)]

    X, y, roles = [], [], []
    for job in jobs:
        skills = job_skills.get(job.id, set())
        X.append([1 if skill in skills else 0 for skill in top_skills])
        y.append(float((job.salary_min + job.salary_max) / 2))
        roles.append(_role_bucket(job.title))

    return np.array(X), np.array(y), roles, top_skills


def main():
    X, y, roles, top_skills = build_dataset()

    if len(X) < 30:
        print(f"Only {len(X)} salary-labeled postings found — not enough to train a useful model yet.")
        return

    role_buckets_with_other = ROLE_BUCKETS + ["other"]
    role_dummies = np.array([[1 if r == role else 0 for role in role_buckets_with_other] for r in roles])
    X_full = np.hstack([X, role_dummies])

    X_train, X_test, y_train, y_test = train_test_split(X_full, y, test_size=0.2, random_state=42)

    model = RandomForestRegressor(n_estimators=200, max_depth=8, random_state=42)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    print(f"Trained on {len(X_train)} rows, tested on {len(X_test)}. MAE: ${mae:,.0f}")

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(model, f"{MODEL_DIR}/salary_model.joblib")
    with open(f"{MODEL_DIR}/salary_model_features.json", "w") as f:
        json.dump({"top_skills": top_skills, "role_buckets": role_buckets_with_other}, f)

    print(f"Saved model to {MODEL_DIR}/salary_model.joblib")


if __name__ == "__main__":
    main()
