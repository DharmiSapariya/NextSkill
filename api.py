from fastapi import FastAPI, HTTPException, Query, Header, Depends, Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
from dotenv import load_dotenv

load_dotenv()
from pydantic import BaseModel
from sqlalchemy import func
from datetime import date
from typing import Optional
from models import Job, Company, Skill, JobSkill, session
from recommend import recommend_skills_data, recommend_skills_with_evidence

app = FastAPI(
    title="NextSkill API",
    description="Real-time, market-aware skill-gap recommendations built from real job posting data.",
    version="0.4.0",
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


class RecommendRequest(BaseModel):
    skills: list[str]
    target_role: str


API_KEY = os.getenv("NEXTSKILL_API_KEY")


def verify_api_key(x_api_key: str = Header(None)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key. Pass it in the X-API-Key header.")
    return x_api_key


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/jobs")
def list_jobs(
    role: Optional[str] = Query(None, description="Filter by keyword in job title"),
    location: Optional[str] = Query(None, description="Filter by keyword in location"),
    limit: int = Query(20, le=100, description="Max results per page (max 100)"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
):
    query = session.query(Job)
    if role:
        query = query.filter(Job.title.ilike(f"%{role}%"))
    if location:
        query = query.filter(Job.location.ilike(f"%{location}%"))

    total = query.count()
    jobs = query.offset(offset).limit(limit).all()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "results": [
            {
                "id": j.id,
                "title": j.title,
                "company": j.company.name if j.company else None,
                "location": j.location,
                "category": j.category,
                "source": j.source,
            }
            for j in jobs
        ],
    }


@app.get("/jobs/{job_id}")
def get_job(job_id: int):
    job = session.query(Job).filter_by(id=job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"No job found with id {job_id}")
    return {
        "id": job.id,
        "title": job.title,
        "company": job.company.name if job.company else None,
        "location": job.location,
        "category": job.category,
        "description": job.description,
        "source": job.source,
    }


@app.get("/companies/top")
def top_companies(limit: int = Query(10, le=50)):
    results = (
        session.query(Company.name, func.count(Job.id).label("postings"))
        .join(Job, Job.company_id == Company.id)
        .group_by(Company.name)
        .order_by(func.count(Job.id).desc())
        .limit(limit)
        .all()
    )
    return {"results": [{"company": name, "postings": count} for name, count in results]}


def _mentions_in_range(skill_id, start, end):
    return (
        session.query(JobSkill)
        .join(Job, Job.id == JobSkill.job_id)
        .filter(JobSkill.skill_id == skill_id)
        .filter(Job.posted_date >= start)
        .filter(Job.posted_date < end)
        .count()
    )


def _total_postings_in_range(start, end):
    return session.query(Job).filter(Job.posted_date >= start).filter(Job.posted_date < end).count()


@app.get("/trends/{skill_name}")
def skill_trend(skill_name: str):
    skill = session.query(Skill).filter(Skill.name.ilike(skill_name)).first()
    if not skill:
        raise HTTPException(status_code=404, detail=f"No data found for skill '{skill_name}'")

    june_start, july_start, aug_start = date(2026, 6, 1), date(2026, 7, 1), date(2026, 8, 1)

    june_mentions = _mentions_in_range(skill.id, june_start, july_start)
    july_mentions = _mentions_in_range(skill.id, july_start, aug_start)
    june_total = _total_postings_in_range(june_start, july_start)
    july_total = _total_postings_in_range(july_start, aug_start)

    june_share = round((june_mentions / june_total) * 100, 2) if june_total else 0
    july_share = round((july_mentions / july_total) * 100, 2) if july_total else 0

    if june_share == 0:
        direction = "new" if july_share > 0 else "flat"
        change_pct = None
    else:
        change_pct = round(((july_share - june_share) / june_share) * 100, 1)
        if change_pct > 15:
            direction = "rising"
        elif change_pct < -15:
            direction = "falling"
        else:
            direction = "flat"

    total_mentions = session.query(JobSkill).filter_by(skill_id=skill.id).count()

    return {
        "skill": skill.name,
        "total_mentions": total_mentions,
        "june_2026": {"mentions": june_mentions, "of_postings": june_total, "share_pct": june_share},
        "july_2026": {"mentions": july_mentions, "of_postings": july_total, "share_pct": july_share},
        "change_pct": change_pct,
        "trend": direction,
        "caveat": "Search coverage expanded from 6 to 21 tech roles between the two periods compared, which can shift each skill's measured share independent of real market demand. Trend confidence will improve as data accumulates under consistent search coverage.",
    }


@app.post("/recommend", dependencies=[Depends(verify_api_key)])
@limiter.limit("10/minute")
def recommend(request: Request, body: RecommendRequest):
    results = recommend_skills_data(body.skills, body.target_role)
    return {
        "target_role": body.target_role,
        "your_skills": body.skills,
        "recommendations": results,
    }


@app.post("/recommend/evidence", dependencies=[Depends(verify_api_key)])
@limiter.limit("10/minute")
def recommend_with_evidence(request: Request, body: RecommendRequest):
    """Like /recommend, but every recommendation includes real postings as evidence —
    radical transparency instead of a black-box score."""
    results = recommend_skills_with_evidence(body.skills, body.target_role)
    return {
        "target_role": body.target_role,
        "your_skills": body.skills,
        "recommendations": results,
    }


@app.get("/skills/{skill_name}/related")
def related_skills(skill_name: str, limit: int = Query(10, le=30)):
    """Find skills that commonly co-occur with the given skill in the same postings —
    e.g. what else does a company usually ask for alongside React?"""
    skill = session.query(Skill).filter(Skill.name.ilike(skill_name)).first()
    if not skill:
        raise HTTPException(status_code=404, detail=f"No data found for skill '{skill_name}'")

    # Get all job IDs that mention this skill
    job_ids_subquery = (
        session.query(JobSkill.job_id)
        .filter(JobSkill.skill_id == skill.id)
    ).scalar_subquery()

    base_count = session.query(job_ids_subquery).count()
    if base_count == 0:
        return {"skill": skill.name, "based_on_postings": 0, "related_skills": []}

    co_occurring = (
        session.query(Skill.name, func.count(JobSkill.id).label("co_occurrences"))
        .join(JobSkill, JobSkill.skill_id == Skill.id)
        .filter(JobSkill.job_id.in_(job_ids_subquery))
        .filter(Skill.id != skill.id)
        .group_by(Skill.name)
        .order_by(func.count(JobSkill.id).desc())
        .limit(limit)
        .all()
    )

    return {
        "skill": skill.name,
        "based_on_postings": base_count,
        "related_skills": [
            {
                "skill": name,
                "co_occurrences": count,
                "co_occurrence_pct": round((count / base_count) * 100, 1),
            }
            for name, count in co_occurring
        ],
    }
