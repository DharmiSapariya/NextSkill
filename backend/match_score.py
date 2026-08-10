"""Statistical resume/skill match score against real postings for a target role.

Rather than comparing a resume to a single job description (the Jobscan/Teal
approach — gameable, no market signal), this compares the user's skills
against every real posting for the target role and reports what fraction of
that market they'd already be a strong match for, grounded in the same
evidence-based approach as the rest of the API.
"""
from collections import defaultdict

from models import Job, JobSkill, Skill, session

# A posting counts as "matched" if the user covers at least this fraction of
# the skills that posting mentions.
MATCH_COVERAGE_THRESHOLD = 0.5


def compute_match_score(user_skills: list[str], target_role: str) -> dict:
    user_skills_lower = {s.lower() for s in user_skills}

    job_ids = [
        job_id
        for (job_id,) in session.query(Job.id).filter(Job.title.ilike(f"%{target_role}%")).all()
    ]
    total = len(job_ids)

    if total == 0:
        return {
            "target_role": target_role,
            "sample_size": 0,
            "match_pct": None,
            "avg_overlap_pct": None,
            "message": f"No postings found for '{target_role}' yet.",
        }

    posting_skills = defaultdict(set)
    rows = (
        session.query(JobSkill.job_id, Skill.name)
        .join(Skill, Skill.id == JobSkill.skill_id)
        .filter(JobSkill.job_id.in_(job_ids))
        .all()
    )
    for job_id, skill_name in rows:
        posting_skills[job_id].add(skill_name.lower())

    matched = 0
    overlaps = []
    for job_id in job_ids:
        required = posting_skills.get(job_id, set())
        if not required:
            continue
        overlap = len(required & user_skills_lower) / len(required)
        overlaps.append(overlap)
        if overlap >= MATCH_COVERAGE_THRESHOLD:
            matched += 1

    scored = len(overlaps)
    match_pct = round((matched / scored) * 100, 1) if scored else None
    avg_overlap_pct = round((sum(overlaps) / scored) * 100, 1) if scored else None

    return {
        "target_role": target_role,
        "sample_size": scored,
        "match_pct": match_pct,
        "avg_overlap_pct": avg_overlap_pct,
        "coverage_threshold_pct": int(MATCH_COVERAGE_THRESHOLD * 100),
    }
