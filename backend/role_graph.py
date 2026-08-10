"""Builds a role-transition graph from real skill co-occurrence data.

Two roles are "close" if postings for those roles tend to ask for similar
skill sets (Jaccard similarity over each role's aggregate skill set). This is
the data behind a force-directed graph visualization: nodes are roles, edges
are similarity above a threshold.

Note: this recomputes each role's skill set per call (fine for ~20 tracked
roles at current data volume). Once Phase 2 caching lands, this is exactly
the kind of endpoint that belongs behind a Redis cache with a daily TTL
rather than recomputed live.
"""
from itertools import combinations

from models import Job, JobSkill, Skill, session

TRACKED_ROLES = [
    "software engineer", "backend developer", "frontend developer", "full stack developer",
    "data scientist", "data analyst", "data engineer", "machine learning engineer",
    "ai engineer", "devops engineer", "cloud engineer", "site reliability engineer",
    "mobile developer", "android developer", "ios developer", "qa engineer",
    "test automation engineer", "cybersecurity analyst", "database administrator",
    "product manager", "ui ux designer",
]

EDGE_SIMILARITY_THRESHOLD = 0.15


def _role_skill_set(role: str) -> tuple[set[str], int]:
    job_ids = [
        job_id
        for (job_id,) in session.query(Job.id).filter(Job.title.ilike(f"%{role}%")).all()
    ]
    if not job_ids:
        return set(), 0

    skills = (
        session.query(Skill.name)
        .join(JobSkill, JobSkill.skill_id == Skill.id)
        .filter(JobSkill.job_id.in_(job_ids))
        .distinct()
        .all()
    )
    return {s[0].lower() for s in skills}, len(job_ids)


def build_transition_graph() -> dict:
    role_skills = {}
    role_counts = {}
    for role in TRACKED_ROLES:
        skills, count = _role_skill_set(role)
        role_skills[role] = skills
        role_counts[role] = count

    nodes = [
        {"id": role, "label": role, "posting_count": role_counts[role]}
        for role in TRACKED_ROLES
        if role_counts[role] > 0
    ]

    edges = []
    for role_a, role_b in combinations(TRACKED_ROLES, 2):
        skills_a, skills_b = role_skills[role_a], role_skills[role_b]
        if not skills_a or not skills_b:
            continue
        intersection = skills_a & skills_b
        union = skills_a | skills_b
        similarity = len(intersection) / len(union) if union else 0
        if similarity >= EDGE_SIMILARITY_THRESHOLD:
            edges.append({
                "source": role_a,
                "target": role_b,
                "weight": round(similarity, 3),
                "shared_skill_count": len(intersection),
            })

    return {"nodes": nodes, "edges": edges}


def nearest_roles(role: str, limit: int = 5) -> list[dict]:
    target_skills, target_count = _role_skill_set(role)
    if target_count == 0:
        return []

    results = []
    for other_role in TRACKED_ROLES:
        if other_role == role:
            continue
        other_skills, other_count = _role_skill_set(other_role)
        if not other_skills:
            continue
        intersection = target_skills & other_skills
        union = target_skills | other_skills
        similarity = len(intersection) / len(union) if union else 0
        results.append({
            "role": other_role,
            "similarity": round(similarity, 3),
            "skills_you_have": sorted(intersection),
            "skills_you_would_need": sorted(other_skills - target_skills)[:15],
        })

    results.sort(key=lambda r: r["similarity"], reverse=True)
    return results[:limit]
