import logging
import re
from collections import Counter
from typing import Any, Dict, List
from sqlalchemy.orm import Session
from sqlalchemy import func

from models import Job, JobSkill, Skill, SessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nextskill.analytics.match_score")

MATCH_COVERAGE_THRESHOLD = 0.5


def compute_match_score(
    user_skills: List[str],
    target_role: str,
    db: Session = None
) -> Dict[str, Any]:
    """Computes statistical resume match score against market job postings.
    Pushes aggregation to SQL to prevent memory bloat and IN parameter limits."""
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        # Normalize candidate skill input
        candidate_skills = {
            s.strip().lower() for s in user_skills if s and s.strip()
        }

        # 1. Fetch total matching jobs for target role (Single fast query)
        role_pattern = f"%{target_role.strip()}%"
        total_role_jobs = (
            db.query(func.count(Job.id))
            .filter(Job.title.ilike(role_pattern))
            .scalar() or 0
        )

        if total_role_jobs == 0:
            return {
                "target_role": target_role,
                "total_market_jobs": 0,
                "parsed_jobs_analyzed": 0,
                "match_pct": None,
                "avg_overlap_pct": None,
                "top_missing_skills": [],
                "message": f"No job postings found matching role '{target_role}'.",
            }

        # 2. Join Job, JobSkill, and Skill in a single SQL query
        query_results = (
            db.query(JobSkill.job_id, Skill.name)
            .join(Job, Job.id == JobSkill.job_id)
            .join(Skill, Skill.id == JobSkill.skill_id)
            .filter(Job.title.ilike(role_pattern))
            .all()
        )

        # 3. Aggregate skills per posting in Python
        posting_skills: Dict[int, set] = {}
        all_market_skills_counter: Counter = Counter()

        for job_id, skill_name in query_results:
            clean_skill = skill_name.strip().lower()
            if job_id not in posting_skills:
                posting_skills[job_id] = set()
            posting_skills[job_id].add(clean_skill)
            all_market_skills_counter[clean_skill] += 1

        parsed_jobs_count = len(posting_skills)
        if parsed_jobs_count == 0:
            return {
                "target_role": target_role,
                "total_market_jobs": total_role_jobs,
                "parsed_jobs_analyzed": 0,
                "match_pct": None,
                "avg_overlap_pct": None,
                "top_missing_skills": [],
                "message": f"Found {total_role_jobs} jobs, but none have parsed skill data.",
            }

        # 4. Calculate market coverage & skill gaps
        matched_postings_count = 0
        overlap_percentages: List[float] = []
        missing_skills_counter: Counter = Counter()

        for job_id, required_skills in posting_skills.items():
            matched_count = len(required_skills & candidate_skills)
            overlap_ratio = matched_count / len(required_skills)
            overlap_percentages.append(overlap_ratio)

            if overlap_ratio >= MATCH_COVERAGE_THRESHOLD:
                matched_postings_count += 1

            # Track skills missing from candidate profile
            missing = required_skills - candidate_skills
            for skill in missing:
                missing_skills_counter[skill] += 1

        match_pct = round((matched_postings_count / parsed_jobs_count) * 100, 1)
        avg_overlap_pct = round(
            (sum(overlap_percentages) / parsed_jobs_count) * 100, 1
        )

        # Top 5 most in-demand skills candidate is missing
        top_missing_skills = [
            {"skill": skill, "market_demand_pct": round((count / parsed_jobs_count) * 100, 1)}
            for skill, count in missing_skills_counter.most_common(5)
        ]

        return {
            "target_role": target_role,
            "total_market_jobs": total_role_jobs,
            "parsed_jobs_analyzed": parsed_jobs_count,
            "match_pct": match_pct,
            "avg_overlap_pct": avg_overlap_pct,
            "coverage_threshold_pct": int(MATCH_COVERAGE_THRESHOLD * 100),
            "top_missing_skills": top_missing_skills,
        }

    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    sample_candidate_skills = ["Python", "SQL", "Docker", "PostgreSQL", "Git"]
    result = compute_match_score(sample_candidate_skills, "Backend")
    print(result)