from fastapi import FastAPI, HTTPException, Query, Depends, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging
import os
import secrets
from dotenv import load_dotenv

load_dotenv()
import sentry_sdk

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    traces_sample_rate=0.1
)

# Sentry only ever sees unhandled exceptions — auth events, admin-access
# denials, and rate-limit trips are all handled (never raise past their
# HTTPException/handler), so without this there was no record of them
# anywhere at all. Configuring the root logger here, not per-module, since
# this is the process entrypoint uvicorn imports; auth.py just does
# logging.getLogger(__name__) and inherits this config.
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("nextskill.api")
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, or_
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional
from models import Job, Company, Skill, JobSkill, User, RecommendationHistory, SharedReport, session
from recommend import recommend_skills_data, recommend_skills_with_evidence
from auth import hash_password, verify_password, create_access_token, get_current_user, get_current_admin_user
from resume_parser import parse_resume
from match_score import compute_match_score
from salary_predict import predict_salary
from role_graph import build_transition_graph, nearest_roles, TRACKED_ROLES
from skill_graph import build_skill_co_occurrence_graph, TOP_N_SKILLS
from role_matcher import resolve_role
from digest import compute_digest_for_user
from cache import cache_get, cache_set
from seniority import infer_seniority, as_postgres_regex, SENIORITY_PATTERNS

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


def _log_and_handle_rate_limit(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    logger.warning("Rate limit exceeded: ip=%s path=%s", get_remote_address(request), request.url.path)
    return _rate_limit_exceeded_handler(request, exc)


app.add_exception_handler(RateLimitExceeded, _log_and_handle_rate_limit)


class RecommendRequest(BaseModel):
    target_role: str
    # If omitted, falls back to the authenticated user's saved skill profile.
    skills: Optional[list[str]] = None


class SignupRequest(BaseModel):
    email: EmailStr
    # max_length=72 matches bcrypt's actual limit: passlib's bcrypt backend
    # silently truncates anything longer, so two different passwords sharing
    # the same first 72 bytes would otherwise both work as this account's
    # password — confirmed directly against this exact passlib config.
    password: str = Field(min_length=8, max_length=72)


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
@limiter.limit("5/minute")
def signup(request: Request, body: SignupRequest):
    email = body.email.lower()
    if session.query(User).filter_by(email=email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    user = User(email=email, hashed_password=hash_password(body.password), skills=[])
    session.add(user)
    session.commit()
    logger.info("New user signed up: id=%s", user.id)
    return TokenResponse(access_token=create_access_token(user.id))


@app.post("/auth/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(request: Request, body: LoginRequest):
    user = session.query(User).filter_by(email=body.email.lower()).first()
    if not user or not verify_password(body.password, user.hashed_password):
        logger.warning("Failed login attempt: email=%s", body.email.lower())
        raise HTTPException(status_code=401, detail="Invalid email or password")
    logger.info("User logged in: id=%s", user.id)
    return TokenResponse(access_token=create_access_token(user.id))


@app.get("/auth/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "skills": current_user.skills or [],
        "tier": current_user.tier,
        "is_admin": current_user.is_admin,
    }


@app.put("/auth/me/skills")
def update_my_skills(body: SkillsUpdateRequest, current_user: User = Depends(get_current_user)):
    current_user.skills = body.skills
    session.commit()
    return {"id": current_user.id, "email": current_user.email, "skills": current_user.skills}


FREE_TIER_HISTORY_LIMIT_CEILING = 20  # matches this endpoint's original default exactly — free never regresses
PRO_TIER_HISTORY_LIMIT_CEILING = 100  # matches the endpoint's original le=100 validation ceiling


@app.get("/auth/me/history")
def recommendation_history(
    target_role: Optional[str] = Query(None, description="Filter to a specific target role"),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
):
    """Past /recommend and /recommend/evidence calls for the logged-in user —
    a single point-in-time snapshot isn't progress, a history of them is.
    Tiered access (Phase 5): every account can see its history, a pro
    account can pull more of it in one call."""
    tier_ceiling = PRO_TIER_HISTORY_LIMIT_CEILING if current_user.tier == "pro" else FREE_TIER_HISTORY_LIMIT_CEILING
    effective_limit = min(limit, tier_ceiling)

    query = session.query(RecommendationHistory).filter_by(user_id=current_user.id)
    if target_role:
        query = query.filter(RecommendationHistory.resolved_role == resolve_role(target_role)["resolved"])

    entries = query.order_by(RecommendationHistory.created_at.desc()).limit(effective_limit).all()
    return {
        "results": [
            {
                "id": e.id,
                "target_role": e.target_role,
                "resolved_role": e.resolved_role,
                "skills_at_time": e.skills_at_time,
                "recommendations": e.recommendations,
                "created_at": e.created_at.isoformat(),
            }
            for e in entries
        ],
    }


@app.get("/auth/me/history/progress")
def recommendation_progress(
    target_role: str = Query(..., description="Target role to compare oldest vs. newest recorded run for"),
    current_user: User = Depends(get_current_user),
):
    """Compares the earliest and most recent recorded /recommend run for a
    role, so a user can see which gap skills they've actually closed."""
    resolved = resolve_role(target_role)["resolved"]
    entries = (
        session.query(RecommendationHistory)
        .filter_by(user_id=current_user.id, resolved_role=resolved)
        .order_by(RecommendationHistory.created_at.asc())
        .all()
    )

    if len(entries) < 2:
        return {
            "target_role": target_role,
            "resolved_role": resolved,
            "runs_recorded": len(entries),
            "message": "Need at least 2 recorded runs for this role to show progress. Call /recommend for this role again later to build history.",
        }

    first, last = entries[0], entries[-1]
    first_gaps = {r["skill"] for r in first.recommendations}
    last_gaps = {r["skill"] for r in last.recommendations}

    return {
        "target_role": target_role,
        "resolved_role": resolved,
        "runs_recorded": len(entries),
        "first_run_at": first.created_at.isoformat(),
        "latest_run_at": last.created_at.isoformat(),
        "skills_closed": sorted(first_gaps - last_gaps),  # were a gap, aren't anymore
        "skills_still_open": sorted(first_gaps & last_gaps),
        "new_gaps": sorted(last_gaps - first_gaps),  # weren't flagged before, are now (market shifted, or skills changed)
    }


@app.get("/auth/me/digest")
def my_digest(current_user: User = Depends(get_current_user)):
    """Phase 4: "weekly digest notifications — 'your target role's top gap
    skill just changed.'" This is the computation only, not email delivery
    (needs real SMTP credentials this environment can't provision) — but
    it's the exact question a digest email would answer, so it's useful on
    its own today and is what a future email step would send verbatim.

    Unlike /auth/me/history/progress (first run vs. latest, all-time),
    this compares the latest run against the one right before it — "what's
    new since you last looked," not the whole history's worth of change."""
    changes = compute_digest_for_user(current_user.id)
    if not changes:
        return {"changes": [], "message": "No change in your top gap skill since your last recorded run, for any tracked role."}
    return {"changes": changes}


@app.post("/auth/me/history/{history_id}/share")
def share_recommendation(history_id: int, current_user: User = Depends(get_current_user)):
    """Publishes one past /recommend or /recommend/evidence run as a public,
    login-free link — Phase 4's "shareable public skill-report pages."
    Nothing is shareable until a user explicitly chooses to publish it;
    the rest of their history stays private."""
    entry = session.query(RecommendationHistory).filter_by(id=history_id, user_id=current_user.id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="No recommendation history entry found with that id")

    token = secrets.token_urlsafe(24)
    shared = SharedReport(
        token=token,
        user_id=current_user.id,
        target_role=entry.target_role,
        resolved_role=entry.resolved_role,
        skills_at_time=entry.skills_at_time,
        recommendations=entry.recommendations,
    )
    session.add(shared)
    session.commit()
    logger.info("Shared report created: user id=%s token=%s", current_user.id, token)

    return {"token": token, "share_path": f"/reports/{token}"}


@app.get("/reports/{token}")
def get_shared_report(token: str):
    """Public, no auth required — this is the whole point of a shareable
    link. Returns only the report snapshot, never the owning user's email
    or id."""
    shared = session.query(SharedReport).filter_by(token=token).first()
    if not shared:
        raise HTTPException(status_code=404, detail="No shared report found for this link")
    return {
        "target_role": shared.target_role,
        "resolved_role": shared.resolved_role,
        "skills_at_time": shared.skills_at_time,
        "recommendations": shared.recommendations,
        "shared_at": shared.created_at.isoformat(),
    }


@app.get("/auth/me/shared-reports")
def my_shared_reports(current_user: User = Depends(get_current_user)):
    """Lists the current user's own published links — without this, the only
    place a token was ever surfaced was the create response right after
    POST /auth/me/history/{id}/share. A client that didn't hang onto that
    response (a page refresh, a different device, a new session) had no way
    to find out what it had published, let alone revoke it."""
    shared = (
        session.query(SharedReport)
        .filter_by(user_id=current_user.id)
        .order_by(SharedReport.created_at.desc())
        .all()
    )
    return {
        "results": [
            {
                "token": s.token,
                "share_path": f"/reports/{s.token}",
                "target_role": s.target_role,
                "resolved_role": s.resolved_role,
                "shared_at": s.created_at.isoformat(),
            }
            for s in shared
        ],
    }


@app.delete("/auth/me/history/shared/{token}")
def revoke_shared_report(token: str, current_user: User = Depends(get_current_user)):
    """Revokes a previously published link — owner-only, so a shared report
    isn't permanently public with no way to take it back."""
    shared = session.query(SharedReport).filter_by(token=token, user_id=current_user.id).first()
    if not shared:
        raise HTTPException(status_code=404, detail="No shared report found for this link")
    session.delete(shared)
    session.commit()
    logger.info("Shared report revoked: user id=%s token=%s", current_user.id, token)
    return {"revoked": True}


MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024  # 5MB — generous for a resume, small enough to bound memory/CPU per upload


@app.post("/auth/me/resume")
async def upload_resume(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    """Parses an uploaded resume (PDF or DOCX) and merges the skills it finds
    into the user's saved skill profile."""
    file_bytes = await file.read(MAX_RESUME_SIZE_BYTES + 1)
    if len(file_bytes) > MAX_RESUME_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Resume file too large — max {MAX_RESUME_SIZE_BYTES // (1024 * 1024)}MB.",
        )
    try:
        found_skills = parse_resume(file.filename, file_bytes)
    except ValueError as e:
        logger.warning("Resume upload rejected: user id=%s reason=%s", current_user.id, e)
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
    role_resolution = resolve_role(body.target_role)
    result = compute_match_score(skills, role_resolution["resolved"])
    result["role_resolution"] = role_resolution
    return result


@app.post("/predict-salary")
def salary_prediction(body: RecommendRequest, current_user: User = Depends(get_current_user)):
    skills = body.skills if body.skills is not None else (current_user.skills or [])
    role_resolution = resolve_role(body.target_role)
    result = predict_salary(skills, role_resolution["resolved"])
    if result is None:
        raise HTTPException(
            status_code=503,
            detail="No salary model has been trained yet. Run train_salary_model.py once enough salary-labeled postings exist.",
        )
    result["role_resolution"] = role_resolution
    return result


@app.get("/roles/transition-graph")
def transition_graph():
    """Graph-shaped data for a force-directed role-transition visualization."""
    cache_key = "transition-graph"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached
    result = build_transition_graph()
    cache_set(cache_key, result, ttl_seconds=86400)  # data only changes when the pipeline re-ingests
    return result


@app.get("/roles/{role}/nearest")
def role_nearest(role: str, limit: int = Query(5, ge=1, le=20)):
    role_resolution = resolve_role(role)
    resolved_role = role_resolution["resolved"]
    if resolved_role not in TRACKED_ROLES:
        raise HTTPException(
            status_code=404,
            detail=f"'{role}' isn't a tracked role. Tracked roles: {', '.join(TRACKED_ROLES)}",
        )

    # /roles/transition-graph, /trends/{skill}, and /skills/{skill}/related
    # are all cached — this was the one similarly expensive aggregate
    # endpoint that wasn't, computing nearest_roles() (2 queries across all
    # tracked roles, per the role_graph.py fix earlier this session) fresh
    # on every single request.
    cache_key = f"role-nearest:{resolved_role}:{limit}"
    cached = cache_get(cache_key)
    if cached is not None:
        return {"role": role, "role_resolution": role_resolution, "nearest_roles": cached}

    nearest = nearest_roles(resolved_role, limit=limit)
    cache_set(cache_key, nearest, ttl_seconds=86400)  # data only changes when the pipeline re-ingests
    return {
        "role": role,
        "role_resolution": role_resolution,
        "nearest_roles": nearest,
    }


@app.get("/jobs")
def list_jobs(
    role: Optional[str] = Query(None, description="Filter by keyword in job title"),
    location: Optional[str] = Query(None, description="Filter by keyword in location"),
    seniority: Optional[Literal["junior", "mid", "senior", "unspecified"]] = Query(
        None, description="Filter by seniority inferred from the title"
    ),
    limit: int = Query(20, ge=1, le=100, description="Max results per page (max 100)"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
):
    query = session.query(Job)
    if role:
        query = query.filter(Job.title.ilike(f"%{role}%"))
    if location:
        query = query.filter(Job.location.ilike(f"%{location}%"))
    if seniority:
        # Same SENIORITY_PATTERNS used for the per-job label below, applied
        # as a Postgres regex filter — one definition, so the filter and the
        # label can't silently disagree with each other.
        if seniority == "unspecified":
            combined = "|".join(SENIORITY_PATTERNS.values())
            query = query.filter(~Job.title.op("~*")(as_postgres_regex(f"({combined})")))
        else:
            query = query.filter(Job.title.op("~*")(as_postgres_regex(SENIORITY_PATTERNS[seniority])))

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
                "seniority": infer_seniority(j.title),
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
def top_companies(limit: int = Query(10, ge=1, le=50)):
    results = (
        session.query(Company.name, func.count(Job.id).label("postings"))
        .join(Job, Job.company_id == Company.id)
        .group_by(Company.name)
        .order_by(func.count(Job.id).desc())
        .limit(limit)
        .all()
    )
    return {"results": [{"company": name, "postings": count} for name, count in results]}


ADMIN_SIGNUP_WINDOW_DAYS = 30


@app.get("/admin/stats")
def admin_stats(current_user: User = Depends(get_current_admin_user)):
    """Phase 5: "admin/analytics dashboard — aggregate insights that double
    as marketing material." Aggregate platform stats only, no per-user
    data — a real admin dashboard would need a lot more (individual user
    lookup, moderation), this is the aggregate-numbers slice of it."""
    signup_cutoff = datetime.now(timezone.utc) - timedelta(days=ADMIN_SIGNUP_WINDOW_DAYS)

    top_target_roles = (
        session.query(RecommendationHistory.resolved_role, func.count(RecommendationHistory.id).label("times_requested"))
        .group_by(RecommendationHistory.resolved_role)
        .order_by(func.count(RecommendationHistory.id).desc())
        .limit(10)
        .all()
    )

    return {
        "total_users": session.query(User).count(),
        "signups_last_30_days": session.query(User).filter(User.created_at >= signup_cutoff).count(),
        "total_jobs": session.query(Job).count(),
        "total_companies": session.query(Company).count(),
        "total_skills": session.query(Skill).count(),
        "total_skill_mentions": session.query(JobSkill).count(),
        "total_shared_reports": session.query(SharedReport).count(),
        "top_target_roles": [
            {"role": role, "times_requested": count} for role, count in top_target_roles
        ],
    }


# Fixed whitelist of roles used to define the comparison universe for trend
# calculations. This exists specifically to control for the fact that our
# Adzuna search coverage expanded from a small initial set of roles to 21
# over the course of the project — the intermediate "6 roles" state was
# never committed to git, so the exact original set can't be recovered.
# Rather than comparing against ALL postings (which mixes roles that were
# only searched for starting in the later, wider fetch, and inflates or
# deflates shares for reasons unrelated to real market demand), we restrict
# both periods to this fixed, currently-defined core set so the denominator
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


def _classify_trend(previous_share: float, current_share: float) -> tuple[float | None, str]:
    """Pure classification logic, pulled out of skill_trend() so the four
    branches (new / flat / rising / falling) can be unit tested directly —
    real seed/production data rarely has a convenient mix of periods with
    and without prior mentions on demand."""
    if previous_share == 0:
        return None, ("new" if current_share > 0 else "flat")
    change_pct = round(((current_share - previous_share) / previous_share) * 100, 1)
    if change_pct > 15:
        return change_pct, "rising"
    if change_pct < -15:
        return change_pct, "falling"
    return change_pct, "flat"


# Above this current-period share, a skill counts as "widespread" rather
# than "niche" for lifecycle classification — e.g. Python's ~57% share is
# obviously mature, while a skill mentioned in 1% of postings isn't "mature"
# just because its trend happens to be flat this period.
LIFECYCLE_SHARE_THRESHOLD_PCT = 5.0


def _classify_lifecycle(previous_share: float, current_share: float, direction: str) -> str:
    """Roadmap Phase 3: "skill lifecycle labels — emerging / growing / mature
    / declining, not just this month's up-or-down." A single 2-period trend
    direction alone can't tell "just starting to take off" (emerging) apart
    from "already everywhere, still climbing" (growing) — this combines
    direction with how widespread the skill already is.

    This is a documented heuristic on top of the same 2-period comparison
    /trends already caveats as "not a forecast" — with the ~2 months of real
    history this dataset currently has, that's an honest limit. Two extra
    outcomes beyond the roadmap's four core labels exist for the same
    reason /trends returns explicit "new"/"flat" rather than forcing a
    misleading guess: "insufficient_data" (a skill with no presence in
    either period — nothing to classify) and "niche" (flat and never
    widespread — not accelerating, not established, not going away either).
    """
    if previous_share == 0 and current_share == 0:
        return "insufficient_data"
    if direction == "falling":
        return "declining"
    if direction == "new":
        return "emerging"
    if direction == "rising":
        return "growing" if current_share >= LIFECYCLE_SHARE_THRESHOLD_PCT else "emerging"
    # direction == "flat"
    return "mature" if current_share >= LIFECYCLE_SHARE_THRESHOLD_PCT else "niche"


TREND_WINDOW_DAYS = 30


def _trend_window():
    """Two adjacent TREND_WINDOW_DAYS-day windows, anchored to the most
    recently ingested core-role posting rather than wall-clock "today".

    Anchoring to real time was the original bug here: the comparison was
    hardcoded to June vs. July 2026, so it never moved even as the scheduled
    ingestion pipeline (Phase 2) brought in new postings every day — trends
    were permanently frozen on two fixed calendar months. Anchoring to the
    latest ingested posted_date instead means this endpoint's "current"
    period is always genuinely current relative to the data actually on
    hand, and it's deterministic for tests regardless of what day they run.
    Returns None if there's no core-role data at all yet.
    """
    latest = session.query(func.max(Job.posted_date)).filter(_core_role_filter()).scalar()
    if latest is None:
        return None
    current_end = latest + timedelta(days=1)  # exclusive upper bound
    current_start = current_end - timedelta(days=TREND_WINDOW_DAYS)
    previous_start = current_start - timedelta(days=TREND_WINDOW_DAYS)
    return previous_start, current_start, current_end


@app.get("/trends/{skill_name}")
def skill_trend(skill_name: str):
    cache_key = f"trend:{skill_name.lower()}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    skill = session.query(Skill).filter(Skill.name.ilike(skill_name)).first()
    if not skill:
        raise HTTPException(status_code=404, detail=f"No data found for skill '{skill_name}'")

    window = _trend_window()
    if window is None:
        raise HTTPException(status_code=503, detail="No posting data ingested yet for the tracked core roles.")
    previous_start, current_start, current_end = window

    previous_mentions = _mentions_in_range(skill.id, previous_start, current_start)
    current_mentions = _mentions_in_range(skill.id, current_start, current_end)
    previous_total = _total_postings_in_range(previous_start, current_start)
    current_total = _total_postings_in_range(current_start, current_end)

    previous_share = round((previous_mentions / previous_total) * 100, 2) if previous_total else 0
    current_share = round((current_mentions / current_total) * 100, 2) if current_total else 0
    change_pct, direction = _classify_trend(previous_share, current_share)
    lifecycle = _classify_lifecycle(previous_share, current_share, direction)

    total_mentions = session.query(JobSkill).filter_by(skill_id=skill.id).count()

    result = {
        "skill": skill.name,
        "total_mentions": total_mentions,
        "window_days": TREND_WINDOW_DAYS,
        "previous_period": {
            "start": previous_start.isoformat(),
            "end": current_start.isoformat(),
            "mentions": previous_mentions,
            "of_postings": previous_total,
            "share_pct": previous_share,
        },
        "current_period": {
            "start": current_start.isoformat(),
            "end": current_end.isoformat(),
            "mentions": current_mentions,
            "of_postings": current_total,
            "share_pct": current_share,
        },
        "change_pct": change_pct,
        "trend": direction,
        "lifecycle": lifecycle,
        "methodology": (
            f"Compares two adjacent {TREND_WINDOW_DAYS}-day windows, anchored to the most "
            f"recently ingested posting, restricted to a fixed set of {len(CORE_TREND_ROLES)} "
            "core roles (software/backend/frontend/full-stack/data/ML roles) to control for "
            "search coverage expanding from a smaller initial role set to 21 roles over the "
            "project's timeline. `lifecycle` combines `trend` with whether current_period's "
            f"share is above {LIFECYCLE_SHARE_THRESHOLD_PCT}% (\"widespread\") to distinguish "
            "e.g. emerging (rising, still small) from growing (rising, already widespread)."
        ),
        "caveat": (
            "Still a 2-period comparison, not a forecast. A real time-series model (e.g. "
            "rolling trend or Prophet/ARIMA) needs several more windows of consistent data "
            "before it would add real signal over this simpler comparison. `lifecycle` is a "
            "heuristic on the same 2-period data, not a separately validated model."
        ),
    }
    cache_set(cache_key, result, ttl_seconds=3600)
    return result


def _record_recommendation_history(user, target_role, resolved_role, skills, results):
    session.add(RecommendationHistory(
        user_id=user.id,
        target_role=target_role,
        resolved_role=resolved_role,
        skills_at_time=skills,
        recommendations=results,
    ))
    session.commit()


@app.post("/recommend")
@limiter.limit("10/minute")
def recommend(request: Request, body: RecommendRequest, current_user: User = Depends(get_current_user)):
    skills = body.skills if body.skills is not None else (current_user.skills or [])
    role_resolution = resolve_role(body.target_role)
    results = recommend_skills_data(skills, role_resolution["resolved"])
    _record_recommendation_history(current_user, body.target_role, role_resolution["resolved"], skills, results)
    return {
        "target_role": body.target_role,
        "role_resolution": role_resolution,
        "your_skills": skills,
        "recommendations": results,
    }


FREE_TIER_EVIDENCE_LIMIT = 3  # unchanged from this endpoint's original default — free never regresses
PRO_TIER_EVIDENCE_LIMIT = 10


@app.post("/recommend/evidence")
@limiter.limit("10/minute")
def recommend_with_evidence(request: Request, body: RecommendRequest, current_user: User = Depends(get_current_user)):
    """Like /recommend, but every recommendation includes real postings as evidence —
    radical transparency instead of a black-box score. Tiered access (Phase 5): every
    account gets real evidence, a pro account gets more of it per recommendation."""
    skills = body.skills if body.skills is not None else (current_user.skills or [])
    role_resolution = resolve_role(body.target_role)
    evidence_limit = PRO_TIER_EVIDENCE_LIMIT if current_user.tier == "pro" else FREE_TIER_EVIDENCE_LIMIT
    results = recommend_skills_with_evidence(skills, role_resolution["resolved"], evidence_limit=evidence_limit)
    _record_recommendation_history(current_user, body.target_role, role_resolution["resolved"], skills, results)
    return {
        "target_role": body.target_role,
        "role_resolution": role_resolution,
        "your_skills": skills,
        "recommendations": results,
        "tier": current_user.tier,
    }


@app.get("/skills/{skill_name}/related")
def related_skills(skill_name: str, limit: int = Query(10, ge=1, le=30)):
    """Find skills that commonly co-occur with the given skill in the same postings —
    e.g. what else does a company usually ask for alongside React?"""
    cache_key = f"related:{skill_name.lower()}:{limit}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    skill = session.query(Skill).filter(Skill.name.ilike(skill_name)).first()
    if not skill:
        raise HTTPException(status_code=404, detail=f"No data found for skill '{skill_name}'")

    job_ids_subquery = (
        session.query(JobSkill.job_id)
        .filter(JobSkill.skill_id == skill.id)
    ).scalar_subquery()

    base_count = session.query(job_ids_subquery).count()
    if base_count == 0:
        result = {"skill": skill.name, "based_on_postings": 0, "related_skills": []}
        cache_set(cache_key, result, ttl_seconds=3600)
        return result

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

    result = {
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
    cache_set(cache_key, result, ttl_seconds=3600)
    return result


@app.get("/skills/co-occurrence-graph")
def skill_co_occurrence_graph(limit: int = Query(TOP_N_SKILLS, ge=5, le=60)):
    """Graph-shaped data for a force-directed skill co-occurrence
    visualization — same nodes/edges pattern as /roles/transition-graph,
    applied to skills instead of roles."""
    cache_key = f"skill-co-occurrence-graph:{limit}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached
    result = build_skill_co_occurrence_graph(limit=limit)
    cache_set(cache_key, result, ttl_seconds=86400)  # data only changes when the pipeline re-ingests
    return result
