from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func
from typing import Optional
from models import Job, Company, Skill, JobSkill, session
from recommend import recommend_skills_data

app = FastAPI(
    title="NextSkill API",
    description="Real-time, market-aware skill-gap recommendations built from real job posting data.",
    version="0.1.0",
)


class RecommendRequest(BaseModel):
    skills: list[str]
    target_role: str


class JobOut(BaseModel):
    id: int
    title: str
    company: Optional[str]
    location: Optional[str]
    category: Optional[str]
    source: str

    class Config:
        from_attributes = True


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


@app.get("/trends/{skill_name}")
def skill_trend(skill_name: str):
    skill = session.query(Skill).filter(Skill.name.ilike(skill_name)).first()
    if not skill:
        raise HTTPException(status_code=404, detail=f"No data found for skill '{skill_name}'")

    mention_count = session.query(JobSkill).filter_by(skill_id=skill.id).count()
    return {
        "skill": skill.name,
        "total_mentions": mention_count,
        "note": "Time-based trend tracking not yet implemented — this is a current snapshot only.",
    }


@app.post("/recommend")
def recommend(request: RecommendRequest):
    results = recommend_skills_data(request.skills, request.target_role)
    return {
        "target_role": request.target_role,
        "your_skills": request.skills,
        "recommendations": results,
    }
