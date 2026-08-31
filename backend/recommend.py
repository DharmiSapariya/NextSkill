import logging
import re
from typing import Any, Dict, List, Optional, Set, Tuple
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from models import Company, Job, JobSkill, SessionLocal, Skill

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("nextskill.analytics.recommendations")

# Role noise words to suppress "echo" skill recommendations
ROLE_NOISE_WORDS: Set[str] = {
    "scientist", "science", "engineer", "engineering",
    "developer", "development", "analyst", "analytics",
    "lead", "senior", "junior", "principal", "manager"
}


def _is_role_echo_skill(skill_name: str, role_words: Set[str]) -> bool:
    """Detects whether a skill name is merely a repetition of the target role title."""
    skill_words = set(skill_name.lower().split())
    if not skill_words:
        return False
    return skill_words.issubset(role_words | ROLE_NOISE_WORDS)


def recommend_skills_data(
    user_skills: List[str],
    target_role_keyword: str,
    top_n: int = 10,
    db: Session = None,
) -> Dict[str, Any]:
    """Computes skill gaps by comparing candidate skills against market demand for a role."""
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        user_skills_lower = {s.strip().lower() for s in user_skills if s and s.strip()}
        target_role_clean = target_role_keyword.strip()
        role_words = set(target_role_clean.lower().split())
        role_pattern = f"%{target_role_clean}%"

        # 1. Get total market sample size for context denominator
        total_market_jobs = (
            db.query(func.count(Job.id))
            .filter(Job.title.ilike(role_pattern))
            .scalar() or 0
        )

        if total_market_jobs == 0:
            return {
                "target_role": target_role_clean,
                "total_market_jobs": 0,
                "recommendations": [],
            }

        # 2. Single aggregated query for skill demand
        results = (
            db.query(Skill.id, Skill.name, func.count(JobSkill.job_id).label("mentions"))
            .join(JobSkill, JobSkill.skill_id == Skill.id)
            .join(Job, Job.id == JobSkill.job_id)
            .filter(Job.title.ilike(role_pattern))
            .group_by(Skill.id, Skill.name)
            .order_by(func.count(JobSkill.job_id).desc())
            .all()
        )

        gaps: List[Dict[str, Any]] = []
        for skill_id, name, mentions in results:
            name_lower = name.lower()

            if name_lower in user_skills_lower:
                continue

            if _is_role_echo_skill(name, role_words):
                continue

            demand_pct = round((mentions / total_market_jobs) * 100, 1)
            gaps.append({
                "skill_id": skill_id,
                "skill": name,
                "postings_mentioning_it": mentions,
                "market_demand_pct": demand_pct,
            })

            if len(gaps) >= top_n:
                break

        return {
            "target_role": target_role_clean,
            "total_market_jobs": total_market_jobs,
            "recommendations": gaps,
        }

    finally:
        if close_db:
            db.close()


def recommend_skills_with_evidence(
    user_skills: List[str],
    target_role_keyword: str,
    top_n: int = 5,
    evidence_limit: int = 3,
    db: Session = None,
) -> Dict[str, Any]:
    """Generates skill recommendations with real posting evidence attached via single-pass batch query."""
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        # Step 1: Compute gaps
        result_data = recommend_skills_data(
            user_skills=user_skills,
            target_role_keyword=target_role_keyword,
            top_n=top_n,
            db=db,
        )

        recommendations = result_data.get("recommendations", [])
        if not recommendations:
            return result_data

        target_role_clean = result_data["target_role"]
        skill_ids = [r["skill_id"] for r in recommendations]

        # Step 2: Batch fetch evidence for all recommended skills in a single query with eager joins
        role_pattern = f"%{target_role_clean}%"
        evidence_rows = (
            db.query(JobSkill.skill_id, Job)
            .options(joinedload(Job.company))
            .join(Job, Job.id == JobSkill.job_id)
            .filter(
                JobSkill.skill_id.in_(skill_ids),
                Job.title.ilike(role_pattern),
            )
            .all()
        )

        # Map evidence records to skill IDs in memory (limiting per skill)
        evidence_map: Dict[int, List[Dict[str, Optional[str]]]] = {sid: [] for sid in skill_ids}
        for skill_id, job in evidence_rows:
            if len(evidence_map[skill_id]) < evidence_limit:
                evidence_map[skill_id].append({
                    "title": job.title,
                    "company": job.company.name if job.company else None,
                    "location": job.location or "Remote / Unspecified",
                })

        # Attach evidence to output payload
        for rec in recommendations:
            rec["evidence"] = evidence_map.get(rec["skill_id"], [])
            rec.pop("skill_id", None)  # Remove internal database ID from final API response

        return result_data

    finally:
        if close_db:
            db.close()


def recommend_skills(
    user_skills: List[str],
    target_role_keyword: str,
    top_n: int = 10,
) -> None:
    """CLI printer wrapper around core engine logic."""
    data = recommend_skills_data(user_skills, target_role_keyword, top_n)
    print(f"\nTarget role: '{data['target_role']}' (Analyzed {data['total_market_jobs']} postings)")
    print(f"Your skills: {', '.join(user_skills) if user_skills else 'None listed'}")
    print(f"\nTop {top_n} skills you're missing, ranked by demand:\n")

    for rec in data["recommendations"]:
        print(
            f"  {rec['skill']:30s} — mentioned in {rec['postings_mentioning_it']} postings "
            f"({rec['market_demand_pct']}% of market)"
        )


if __name__ == "__main__":
    # Test CLI output
    recommend_skills(
        user_skills=["Python", "SQL"],
        target_role_keyword="data scientist",
    )

    # Test structured evidence payload
    structured_res = recommend_skills_with_evidence(
        user_skills=["Python", "SQL"],
        target_role_keyword="data scientist",
        top_n=3,
        evidence_limit=2,
    )
    import json
    print("\nStructured Payload with Evidence:")
    print(json.dumps(structured_res, indent=2))