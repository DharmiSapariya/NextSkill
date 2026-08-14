from fastapi import FastAPI, HTTPException, Query, Depends, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
from dotenv import load_dotenv

load_dotenv()
import sentry_sdk

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    traces_sample_rate=0.1
)
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, or_
from datetime import date
from typing import Optional
from models import Job, Company, Skill, JobSkill, User, session
from recommend import recommend_skills_data, recommend_skills_with_evidence
from auth import hash_password, verify_password, create_access_token, get_current_user
from resume_parser import parse_resume
from match_score import compute_match_score
from salary_predict import predict_salary
from role_graph import build_transition_graph, nearest_roles, TRACKED_ROLES

app = FastAPI(
    title="NextSkill API",
    description="Real-time, market-aware skill-gap recommendations built from real job posting data.",
    version="0.4.0",
)

# Comma-separated list of allowed frontend origins, e.g. "https://nextskill.app,http://localhost:5173"
FRONTEND_ORIGINS = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


class RecommendRequest(BaseModel):
    target_role: str
    # If omitted, falls back to the authenticated user's saved skill profile.
    skills: Optional[list[str]] = None


class SignupRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class SkillsUpdateRequest(BaseModel):
    skills: list[str]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/auth/signup", response_model=TokenResponse)
def signup(body: SignupRequest):
    email = body.email.lower()
    if session.query(User).filter_by(email=email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    user = User(email=email, hashed_password=hash_password(body.password), skills=[])
    session.add(user)
    session.commit()
    return TokenResponse(access_token=create_access_token(user.id))


@app.post("/auth/login", response_model=TokenResponse)
def login(body: LoginRequest):
    user = session.query(User).filter_by(email=body.email.lower()).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return TokenResponse(access_token=create_access_token(user.id))


@app.get("/auth/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email, "skills": current_user.skills or []}


@app.put("/auth/me/skills")
def update_my_skills(body: SkillsUpdateRequest, current_user: User = Depends(get_current_user)):
    current_user.skills = body.skills
    session.commit()
    return {"id": current_user.id, "email": current_user.email, "skills": current_user.skills}


@app.post("/auth/me/resume")
async def upload_resume(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    """Parses an uploaded resume (PDF or DOCX) and merges the skills it finds
    into the user's saved skill profile."""
    file_bytes = await file.read()
    try:
        found_skills = parse_resume(file.filename, file_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    existing = set(current_user.skills or [])
    current_user.skills = sorted(existing | set(found_skills))
    session.commit()

    return {
        "id": current_user.id,
        "email": current_user.email,
        "skills_found_in_resume": found_skills,
        "skills": current_user.skills,
    }


@app.post("/match-score")
def match_score(body: RecommendRequest, current_user: User = Depends(get_current_user)):
    """Statistical match score: what % of real postings for the target role
    the user's current skills would be a strong match for."""
    skills = body.skills if body.skills is not None else (current_user.skills or [])
    return compute_match_score(skills, body.target_role)


@app.post("/predict-salary")
def salary_prediction(body: RecommendRequest, current_user: User = Depends(get_current_user)):
    skills = body.skills if body.skills is not None else (current_user.skills or [])
    result = predict_salary(skills, body.target_role)
    if result is None:
        raise HTTPException(
            status_code=503,
            detail="No salary model has been trained yet. Run train_salary_model.py once enough salary-labeled postings exist.",
        )
    return result


@app.get("/roles/transition-graph")
def transition_graph():
    """Graph-shaped data for a force-directed role-transition visualization."""
    return build_transition_graph()


@app.get("/roles/{role}/nearest")
def role_nearest(role: str, limit: int = Query(5, le=20)):
    if role.lower() not in TRACKED_ROLES:
        raise HTTPException(
            status_code=404,
            detail=f"'{role}' isn't a tracked role. Tracked roles: {', '.join(TRACKED_ROLES)}",
        )
    return {"role": role, "nearest_roles": nearest_roles(role.lower(), limit=limit)}


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


# Fixed whitelist of roles used to define the comparison universe for trend
# calculations. This exists specifically to control for the fact that our
# Adzuna search coverage expanded from a small initial set of roles to 21
# over the course of the project — the intermediate "6 roles" state was
# never committed to git, so the exact original set can't be recovered.
# Rather than comparing against ALL postings (which mixes roles that were
# only searched for starting in the later, wider fetch, and inflates or
# deflates shares for reasons unrelated to real market demand), we restrict
# both months to this fixed, currently-defined core set so the denominator
# means the same thing in both periods. This is a deliberate, documented
# choice — not a full fix for the missing historical data, but it removes
# the specific confound we diagnosed.
CORE_TREND_ROLES = [
    "software engineer",
    "backend developer",
    "frontend developer",
    "full stack developer",
    "data scientist",
    "data analyst",
    "data engineer",
    "machine learning engineer",
]


def _core_role_filter():
    return or_(*[Job.title.ilike(f"%{role}%") for role in CORE_TREND_ROLES])


def _mentions_in_range(skill_id, start, end):
    return (
        session.query(JobSkill)
        .join(Job, Job.id == JobSkill.job_id)
        .filter(JobSkill.skill_id == skill_id)
        .filter(Job.posted_date >= start)
        .filter(Job.posted_date < end)
        .filter(_core_role_filter())
        .count()
    )


def _total_postings_in_range(start, end):
    return (
        session.query(Job)
        .filter(Job.posted_date >= start)
        .filter(Job.posted_date < end)
        .filter(_core_role_filter())
        .count()
    )


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
        "methodology": (
            f"Comparison restricted to a fixed set of {len(CORE_TREND_ROLES)} core roles "
            "(software/backend/frontend/full-stack/data/ML roles) present in both months, "
            "to control for search coverage expanding from a smaller initial role set to 21 "
            "roles over the project's timeline."
        ),
        "caveat": (
            "This removes the specific coverage-expansion artifact identified during development, "
            "but is still a 2-month comparison — not a forecast. A real time-series model "
            "(e.g. rolling trend or Prophet/ARIMA) needs several more months of consistent data "
            "before it would add real signal over this simpler comparison."
        ),
    }


@app.post("/recommend")
@limiter.limit("10/minute")
def recommend(request: Request, body: RecommendRequest, current_user: User = Depends(get_current_user)):
    skills = body.skills if body.skills is not None else (current_user.skills or [])
    results = recommend_skills_data(skills, body.target_role)
    return {
        "target_role": body.target_role,
        "your_skills": skills,
        "recommendations": results,
    }


@app.post("/recommend/evidence")
@limiter.limit("10/minute")
def recommend_with_evidence(request: Request, body: RecommendRequest, current_user: User = Depends(get_current_user)):
    """Like /recommend, but every recommendation includes real postings as evidence —
    radical transparency instead of a black-box score."""
    skills = body.skills if body.skills is not None else (current_user.skills or [])
    results = recommend_skills_with_evidence(skills, body.target_role)
    return {
        "target_role": body.target_role,
        "your_skills": skills,
        "recommendations": results,
    }


@app.get("/skills/{skill_name}/related")
def related_skills(skill_name: str, limit: int = Query(10, le=30)):
    """Find skills that commonly co-occur with the given skill in the same postings —
    e.g. what else does a company usually ask for alongside React?"""
    skill = session.query(Skill).filter(Skill.name.ilike(skill_name)).first()
    if not skill:
        raise HTTPException(status_code=404, detail=f"No data found for skill '{skill_name}'")

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
