"""Builds a role-transition graph from real skill co-occurrence data.

Two roles are "close" if postings for those roles tend to ask for similar
skill sets (Jaccard similarity over each role's aggregate skill set). This is
the data behind a force-directed graph visualization: nodes are roles, edges
are similarity above a threshold.

/roles/transition-graph is Redis-cached with a 24h TTL at the API layer
(Phase 2). /roles/{role}/nearest isn't cached there, so nearest_roles()
still recomputes fresh every call — _all_role_skill_data() batches that
into 2 queries total across all tracked roles rather than 2 per role.
"""
from itertools import combinations

from sqlalchemy import or_

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


def _all_role_skill_data() -> dict[str, tuple[set[str], int]]:
    """Single-pass replacement for calling _role_skill_set() once per
    tracked role — that was TRACKED_ROLES (21) separate title-ILIKE queries
    plus 21 more skill queries, 42 total, every time build_transition_graph()
    or nearest_roles() ran. Instead: one query pulls every job whose title
    matches ANY tracked role's substring at all, one query pulls every
    skill mention for exactly those jobs, and both get bucketed per role in
    Python.

    Preserves the original per-role behavior exactly, including a subtlety
    worth calling out: a single job can match more than one role's ILIKE
    substring (e.g. a title containing phrasing that overlaps two tracked
    roles) and the original code let it count toward every role it matched,
    independently, since each role's query was separate. Bucketing in
    Python here checks every role against every matched job's title, so
    that same multi-membership still happens — this is not a behavior
    change, verified by diffing this function's output against the old
    per-role implementation before replacing it.
    """
    combined_filter = or_(*[Job.title.ilike(f"%{role}%") for role in TRACKED_ROLES])
    jobs = session.query(Job.id, Job.title).filter(combined_filter).all()

    role_job_ids: dict[str, set[int]] = {role: set() for role in TRACKED_ROLES}
    for job_id, title in jobs:
        title_lower = title.lower()
        for role in TRACKED_ROLES:
            if role in title_lower:
                role_job_ids[role].add(job_id)

    all_job_ids = [job_id for job_id, _ in jobs]
    job_skills: dict[int, set[str]] = {}
    if all_job_ids:
        skill_rows = (
            session.query(JobSkill.job_id, Skill.name)
            .join(Skill, Skill.id == JobSkill.skill_id)
            .filter(JobSkill.job_id.in_(all_job_ids))
            .all()
        )
        for job_id, skill_name in skill_rows:
            job_skills.setdefault(job_id, set()).add(skill_name.lower())

    result = {}
    for role, job_ids in role_job_ids.items():
        merged_skills: set[str] = set()
        for job_id in job_ids:
            merged_skills |= job_skills.get(job_id, set())
        result[role] = (merged_skills, len(job_ids))
    return result


def build_transition_graph() -> dict:
    role_data = _all_role_skill_data()
    role_skills = {role: skills for role, (skills, _) in role_data.items()}
    role_counts = {role: count for role, (_, count) in role_data.items()}

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
    # role_data.get(...) rather than role_data[...]: the one real caller
    # (api.py's /roles/{role}/nearest) already checks role is in
    # TRACKED_ROLES before calling this, but this function's own contract
    # shouldn't KeyError on an untracked role — it should just find nothing,
    # same as the old per-role query did for any role string.
    role_data = _all_role_skill_data()
    target_skills, target_count = role_data.get(role, (set(), 0))
    if target_count == 0:
        return []

    results = []
    for other_role in TRACKED_ROLES:
        if other_role == role:
            continue
        other_skills, other_count = role_data[other_role]
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
