import logging
from math import sqrt
from typing import Any, Dict, List, Set, Tuple
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from models import Job, JobSkill, Skill, SessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nextskill.analytics.graph")

TRACKED_ROLES: List[str] = [
    "software engineer", "backend developer", "frontend developer", "full stack developer",
    "data scientist", "data analyst", "data engineer", "machine learning engineer",
    "ai engineer", "devops engineer", "cloud engineer", "site reliability engineer",
    "mobile developer", "android developer", "ios developer", "qa engineer",
    "test automation engineer", "cybersecurity analyst", "database administrator",
    "product manager", "ui ux designer",
]

EDGE_SIMILARITY_THRESHOLD: float = 0.12


def _get_role_skill_vectors(db: Session) -> Tuple[Dict[str, Dict[str, float]], Dict[str, int]]:
    """Calculates TF-IDF normalized skill vectors per role directly within the database.
    
    Prevents parameter limits and memory locks by replacing Python set unions with 
    statistically sound term-frequency inverse-document-frequency (TF-IDF) skill weights.
    """
    # 1. Fetch total job count per role
    combined_filter = or_(*[Job.title.ilike(f"%{role}%") for role in TRACKED_ROLES])
    
    role_job_counts_query = (
        db.query(Job.id, Job.title)
        .filter(combined_filter)
        .all()
    )

    role_posting_counts: Dict[str, int] = {role: 0 for role in TRACKED_ROLES}
    role_job_map: Dict[str, Set[int]] = {role: set() for role in TRACKED_ROLES}

    for job_id, title in role_job_counts_query:
        title_lower = title.lower()
        for role in TRACKED_ROLES:
            if role in title_lower:
                role_job_map[role].add(job_id)

    for role in TRACKED_ROLES:
        role_posting_counts[role] = len(role_job_map[role])

    # Reverse index: job_id -> roles it belongs to (usually one, but a
    # posting can legitimately match more than one tracked-role substring,
    # e.g. a title mentioning two role names). Built once, up front, so the
    # skill-frequency pass below does an O(1) dict lookup per row instead of
    # testing every row against all TRACKED_ROLES sets — at real dataset
    # sizes (six figures of job-skill rows) that per-row role scan was the
    # entire cost of this function.
    job_role_membership: Dict[int, List[str]] = {}
    for role, job_ids in role_job_map.items():
        for job_id in job_ids:
            job_role_membership.setdefault(job_id, []).append(role)

    # 2. Database SQL aggregation: Skill frequencies grouped by role
    # Query: Skill name, job_id for all relevant jobs
    raw_skill_data = (
        db.query(JobSkill.job_id, Skill.name)
        .join(Skill, Skill.id == JobSkill.skill_id)
        .join(Job, Job.id == JobSkill.job_id)
        .filter(combined_filter)
        .all()
    )

    # Map raw frequencies: role -> skill -> count
    role_skill_freq: Dict[str, Dict[str, int]] = {role: {} for role in TRACKED_ROLES}
    skill_document_freq: Dict[str, Set[str]] = {}  # Tracks how many roles contain a skill

    for job_id, skill_name in raw_skill_data:
        skill_lower = skill_name.lower()
        for role in job_role_membership.get(job_id, ()):
            role_skill_freq[role][skill_lower] = role_skill_freq[role].get(skill_lower, 0) + 1
            skill_document_freq.setdefault(skill_lower, set()).add(role)

    # 3. Compute TF-IDF weights for each skill per role
    total_roles = len(TRACKED_ROLES)
    role_vectors: Dict[str, Dict[str, float]] = {role: {} for role in TRACKED_ROLES}

    for role, skills in role_skill_freq.items():
        total_role_jobs = role_posting_counts[role]
        if total_role_jobs == 0:
            continue

        for skill, freq in skills.items():
            # Term Frequency (TF): Percentage of postings in this role asking for skill
            tf = freq / total_role_jobs
            
            # Inverse Document Frequency (IDF): Penalizes skills common to ALL roles (e.g., Git)
            roles_with_skill = len(skill_document_freq.get(skill, []))
            idf = sqrt(total_roles / (1 + roles_with_skill))
            
            role_vectors[role][skill] = tf * idf

    return role_vectors, role_posting_counts


def _cosine_similarity(vec_a: Dict[str, float], vec_b: Dict[str, float]) -> float:
    """Computes cosine similarity between two weighted TF-IDF skill vectors."""
    common_skills = set(vec_a.keys()) & set(vec_b.keys())
    if not common_skills:
        return 0.0

    dot_product = sum(vec_a[skill] * vec_b[skill] for skill in common_skills)
    norm_a = sqrt(sum(val ** 2 for val in vec_a.values()))
    norm_b = sqrt(sum(val ** 2 for val in vec_b.values()))

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return dot_product / (norm_a * norm_b)


def build_transition_graph(db: Session = None) -> Dict[str, Any]:
    """Generates graph payload with nodes and similarity-weighted edges."""
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        role_vectors, role_counts = _get_role_skill_vectors(db)

        nodes = [
            {"id": role, "label": role, "posting_count": role_counts[role]}
            for role in TRACKED_ROLES
            if role_counts[role] > 0
        ]

        edges = []
        for i, role_a in enumerate(TRACKED_ROLES):
            vec_a = role_vectors[role_a]
            if not vec_a:
                continue

            for role_b in TRACKED_ROLES[i + 1:]:
                vec_b = role_vectors[role_b]
                if not vec_b:
                    continue

                similarity = _cosine_similarity(vec_a, vec_b)
                if similarity >= EDGE_SIMILARITY_THRESHOLD:
                    shared_skills = set(vec_a.keys()) & set(vec_b.keys())
                    edges.append({
                        "source": role_a,
                        "target": role_b,
                        "weight": round(similarity, 3),
                        "shared_skill_count": len(shared_skills),
                    })

        return {"nodes": nodes, "edges": edges}

    finally:
        if close_db:
            db.close()


def nearest_roles(role: str, limit: int = 5, db: Session = None) -> List[Dict[str, Any]]:
    """Calculates top nearest role transitions for a single target role."""
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        role_clean = role.lower().strip()
        role_vectors, role_counts = _get_role_skill_vectors(db)

        target_vector = role_vectors.get(role_clean, {})
        if not target_vector or role_counts.get(role_clean, 0) == 0:
            return []

        target_skills = set(target_vector.keys())
        results = []

        for other_role, other_vector in role_vectors.items():
            if other_role == role_clean or not other_vector:
                continue

            similarity = _cosine_similarity(target_vector, other_vector)
            other_skills = set(other_vector.keys())
            
            intersection = target_skills & other_skills
            gap_skills = sorted(
                list(other_skills - target_skills),
                key=lambda s: other_vector[s],
                reverse=True
            )[:15]

            results.append({
                "role": other_role,
                "similarity": round(similarity, 3),
                "skills_you_have": sorted(list(intersection)),
                "skills_you_would_need": gap_skills,
            })

        results.sort(key=lambda r: r["similarity"], reverse=True)
        return results[:limit]

    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    # Test suite run
    logger.info("Executing test transition graph generation...")
    graph = build_transition_graph()
    print(f"Graph generated successfully: {len(graph['nodes'])} nodes, {len(graph['edges'])} edges.")

    nearest = nearest_roles("data scientist", limit=3)
    print("\nTop nearest roles for 'data scientist':")
    for item in nearest:
        print(f" - {item['role']} (Similarity: {item['similarity']})")
        print(f"   Missing key skills: {', '.join(item['skills_you_would_need'][:5])}")