"""Skill co-occurrence graph generator.

Computes skill proximity matrices using database-native relational joins and 
normalized similarity measures (Overlap Coefficient & Jaccard) to power 
force-directed network graphs.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import func
from sqlalchemy.orm import Session, aliased

from models import JobSkill, SessionLocal, Skill

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nextskill.analytics.co_occurrence")

TOP_N_SKILLS = 30
EDGE_SIMILARITY_THRESHOLD = 0.10


def _get_top_skills(db: Session, limit: int) -> List[Tuple[int, str, int]]:
    """Retrieves top N skills ranked by posting mention count."""
    return (
        db.query(Skill.id, Skill.name, func.count(JobSkill.job_id).label("mentions"))
        .join(JobSkill, JobSkill.skill_id == Skill.id)
        .group_by(Skill.id, Skill.name)
        .order_by(func.count(JobSkill.job_id).desc())
        .limit(limit)
        .all()
    )


def build_skill_co_occurrence_graph(
    limit: int = TOP_N_SKILLS, 
    threshold: float = EDGE_SIMILARITY_THRESHOLD,
    db: Optional[Session] = None
) -> Dict[str, List[Dict[str, Any]]]:
    """Builds a skill network graph payload using relational SQL co-occurrence joins.

    Args:
        limit: Top N skills to include as graph nodes.
        threshold: Minimum overlap/similarity score required to form an edge.
        db: Optional SQLAlchemy database session.

    Returns:
        Dict containing list of node dicts and weighted edge dicts.
    """
    close_on_exit = False
    if db is None:
        db = SessionLocal()
        close_on_exit = True

    try:
        # 1. Fetch top skills
        top_skills = _get_top_skills(db, limit)
        if not top_skills:
            return {"nodes": [], "edges": []}

        skill_map: Dict[int, Tuple[str, int]] = {
            s_id: (name, mentions) for s_id, name, mentions in top_skills
        }
        target_ids = list(skill_map.keys())

        # Build node objects
        nodes = [
            {"id": name, "label": name, "mention_count": mentions}
            for _, name, mentions in top_skills
        ]

        # 2. Relational Co-occurrence Query directly in SQL Engine
        # Self-join JobSkill on job_id to find shared postings between target skill pairs
        js1 = JobSkill
        js2 = aliased(JobSkill)

        co_occurrence_rows = (
            db.query(
                js1.skill_id.label("skill_a"),
                js2.skill_id.label("skill_b"),
                func.count(js1.job_id).label("shared_count"),
            )
            .join(js2, js1.job_id == js2.job_id)
            .filter(
                js1.skill_id.in_(target_ids),
                js2.skill_id.in_(target_ids),
                js1.skill_id < js2.skill_id,  # Symmetric pair constraint (A < B)
            )
            .group_by(js1.skill_id, js2.skill_id)
            .all()
        )

        # 3. Compute normalized edge weights
        edges = []
        for id_a, id_b, shared_count in co_occurrence_rows:
            name_a, mentions_a = skill_map[id_a]
            name_b, mentions_b = skill_map[id_b]

            # Overlap Coefficient: shared / min(mentions_a, mentions_b)
            # Prevents ultra-common skills (e.g. Python) from drowning out frameworks (e.g. PyTorch)
            min_mentions = min(mentions_a, mentions_b)
            overlap_score = shared_count / min_mentions if min_mentions > 0 else 0.0

            # Standard Jaccard Similarity: shared / (a + b - shared)
            union_count = mentions_a + mentions_b - shared_count
            jaccard_score = shared_count / union_count if union_count > 0 else 0.0

            # Overlap coefficient decides which edges are worth drawing at all
            # (keeps ultra-common skills like Python from drowning out
            # framework-level connections), but the reported weight is the
            # standard Jaccard similarity — the number the graph's actual
            # consumers (and its own docs/tests) are written against.
            if overlap_score >= threshold:
                edges.append({
                    "source": name_a,
                    "target": name_b,
                    "weight": round(jaccard_score, 3),
                    "shared_posting_count": shared_count,
                })

        # Sort edges by strength
        edges.sort(key=lambda e: e["weight"], reverse=True)

        return {"nodes": nodes, "edges": edges}

    finally:
        if close_on_exit:
            db.close()


if __name__ == "__main__":
    # Test execution
    graph = build_skill_co_occurrence_graph(limit=10, threshold=0.05)
    print(f"\n--- Skill Co-occurrence Graph Generated ---")
    print(f"Nodes: {len(graph['nodes'])}")
    print(f"Edges: {len(graph['edges'])}")
    for edge in graph["edges"][:5]:
        print(f" - {edge['source']} <-> {edge['target']} | Overlap: {edge['weight']} | Shared: {edge['shared_posting_count']}")