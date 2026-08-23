"""Builds a skill co-occurrence graph from real postings — the same
graph-shaped node/edge pattern role_graph.py already uses for role
transitions (Phase 5: "graph-shaped API endpoints... extend that pattern
to co-occurrence and trend data too"), applied to skills instead of roles.

Two skills are "close" if they tend to appear together in the same
postings (Jaccard similarity over each skill's set of postings) — same
similarity measure role_graph.py uses, for the same reason: intersection
over union naturally normalizes for how common each skill is on its own,
so a very common skill doesn't dominate every edge just from volume.

Restricted to the TOP_N_SKILLS most-mentioned skills overall. With every
skill in the taxonomy the graph would be too dense — mostly noise from
rare skills with tiny, coincidental overlaps — to be legible in a
force-directed visualization. Same reasoning role_graph.py already applies
by fixing a tracked role list instead of graphing every role phrase ever
seen in a title.
"""
from itertools import combinations

from sqlalchemy import func

from models import JobSkill, Skill, session

TOP_N_SKILLS = 30
EDGE_SIMILARITY_THRESHOLD = 0.1


def _top_skills(limit: int) -> list[tuple[int, str, int]]:
    return (
        session.query(Skill.id, Skill.name, func.count(JobSkill.id).label("mentions"))
        .join(JobSkill, JobSkill.skill_id == Skill.id)
        .group_by(Skill.id, Skill.name)
        .order_by(func.count(JobSkill.id).desc())
        .limit(limit)
        .all()
    )


def _skill_job_id_set(skill_id: int) -> set[int]:
    return {job_id for (job_id,) in session.query(JobSkill.job_id).filter(JobSkill.skill_id == skill_id).all()}


def build_skill_co_occurrence_graph(limit: int = TOP_N_SKILLS) -> dict:
    top = _top_skills(limit)
    job_id_sets = {skill_id: _skill_job_id_set(skill_id) for skill_id, _, _ in top}

    nodes = [{"id": name, "label": name, "mention_count": mentions} for _, name, mentions in top]

    edges = []
    for (id_a, name_a, _), (id_b, name_b, _) in combinations(top, 2):
        set_a, set_b = job_id_sets[id_a], job_id_sets[id_b]
        if not set_a or not set_b:
            continue
        intersection = set_a & set_b
        union = set_a | set_b
        similarity = len(intersection) / len(union) if union else 0
        if similarity >= EDGE_SIMILARITY_THRESHOLD:
            edges.append({
                "source": name_a,
                "target": name_b,
                "weight": round(similarity, 3),
                "shared_posting_count": len(intersection),
            })

    return {"nodes": nodes, "edges": edges}
