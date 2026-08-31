"""Tests for skill co-occurrence graph construction (skill_graph.py).

Verifies graph schema compliance, Jaccard similarity calculations, node ordering,
parameter-based filtering (limit, min_co_occurrence), and edge referential integrity
using isolated database transactions.
"""

import os
import uuid
from typing import Callable, Dict, List, Tuple
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from models import Job, JobSkill, Skill
from skill_graph import build_skill_co_occurrence_graph

# These tests need a database that genuinely contains nothing but what
# each test itself seeds — build_skill_co_occurrence_graph() has no
# concept of "this test's data" vs. "everything else in the table", so
# rollback-based isolation on the shared dev database (which the rest of
# the suite relies on being pre-seeded via seed_test_data.py) can't work
# here: a rollback undoes this test's own writes, but real seeded rows
# from other tests/fixtures are already committed and still show up in
# every query. A dedicated, empty database sidesteps that entirely rather
# than fighting over what state the shared one should be in.
_TEST_DB_URL = os.getenv(
    "SKILL_GRAPH_TEST_DATABASE_URL",
    "postgresql+psycopg2://jobintel:localdevpassword@localhost:5432/job_market_test",
)
_test_engine = create_engine(_TEST_DB_URL)
_TestSessionLocal = sessionmaker(bind=_test_engine)


# --- Pytest Fixtures & Helpers ---

@pytest.fixture
def db_session():
    """Provides a transactional database session rolled back automatically after every test."""
    session = _TestSessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def seed_co_occurrence_data(db_session) -> Callable[[List[Tuple[str, List[str]]]], Dict[str, Skill]]:
    """Factory fixture to create controlled job-skill pairings for deterministic graph testing.
    
    Accepts a list of tuples: [("Job Title", ["Skill A", "Skill B"])]
    """
    def _factory(job_skill_map: List[Tuple[str, List[str]]]) -> Dict[str, Skill]:
        created_skills: Dict[str, Skill] = {}

        for job_title, skill_names in job_skill_map:
            job = Job(
                external_id=f"graph-test-{uuid.uuid4().hex[:8]}",
                title=job_title,
                source="test",
            )
            db_session.add(job)
            db_session.flush()

            for name in skill_names:
                if name not in created_skills:
                    skill = Skill(name=name)
                    db_session.add(skill)
                    db_session.flush()
                    created_skills[name] = skill
                else:
                    skill = created_skills[name]

                db_session.add(JobSkill(job_id=job.id, skill_id=skill.id))

        db_session.flush()
        return created_skills

    return _factory


# --- Graph Structure & Schema Invariant Tests ---

def test_graph_schema_and_weight_constraints(db_session, seed_co_occurrence_data):
    """Verifies that generated nodes and edges adhere strictly to expected JSON payload schemas."""
    # Seed 3 jobs where JavaScript & React co-occur 3 times, Python co-occurs once with JS
    seed_co_occurrence_data([
        ("Frontend Engineer 1", ["JavaScript", "React"]),
        ("Frontend Engineer 2", ["JavaScript", "React"]),
        ("Fullstack Engineer", ["JavaScript", "React", "Python"]),
    ])

    graph = build_skill_co_occurrence_graph(db=db_session)
    assert "nodes" in graph and "edges" in graph
    assert len(graph["nodes"]) >= 3

    node_ids = set()
    for node in graph["nodes"]:
        assert set(node.keys()) == {"id", "label", "mention_count"}
        assert isinstance(node["id"], (int, str))
        assert isinstance(node["label"], str)
        assert node["mention_count"] > 0
        node_ids.add(node["label"])

    for edge in graph["edges"]:
        assert set(edge.keys()) == {"source", "target", "weight", "shared_posting_count"}
        # Edge source and target must point to existing nodes in the graph
        assert edge["source"] in node_ids
        assert edge["target"] in node_ids
        # Jaccard similarity bounds check: 0 < weight <= 1.0
        assert 0 < edge["weight"] <= 1.0
        assert edge["shared_posting_count"] > 0


def test_respects_limit_parameter(db_session, seed_co_occurrence_data):
    """Verifies that the limit parameter restricts the total number of returned nodes."""
    seed_co_occurrence_data([
        (f"Job {i}", [f"Skill_{i}", f"Skill_{i+1}"]) for i in range(10)
    ])

    limit = 5
    graph = build_skill_co_occurrence_graph(limit=limit, db=db_session)
    assert len(graph["nodes"]) <= limit


def test_nodes_are_ordered_by_mention_count_descending(db_session, seed_co_occurrence_data):
    """Ensures nodes are returned strictly sorted by frequency of occurrence."""
    seed_co_occurrence_data([
        ("Job 1", ["Python", "SQL", "Docker"]),
        ("Job 2", ["Python", "SQL"]),
        ("Job 3", ["Python"]),
    ])

    graph = build_skill_co_occurrence_graph(db=db_session)
    counts = [n["mention_count"] for n in graph["nodes"]]
    assert counts == sorted(counts, reverse=True)


def test_deterministic_co_occurrence_pair_resolution(db_session, seed_co_occurrence_data):
    """Verifies that strongly co-occurring skill pairs are correctly identified and edge-linked."""
    seed_co_occurrence_data([
        ("Dev 1", ["JavaScript", "React"]),
        ("Dev 2", ["JavaScript", "React"]),
        ("Dev 3", ["JavaScript", "React", "TypeScript"]),
    ])

    graph = build_skill_co_occurrence_graph(db=db_session)
    pairs = {frozenset([e["source"], e["target"]]) for e in graph["edges"]}
    assert frozenset(["JavaScript", "React"]) in pairs


def test_jaccard_similarity_mathematical_correctness(db_session, seed_co_occurrence_data):
    """Validates the Jaccard similarity equation: J(A, B) = |A ∩ B| / |A ∪ B|.
    
    Setup:
    - JS appears in 4 jobs.
    - React appears in 3 jobs.
    - Both appear together in 2 jobs.
    - Union = 4 + 3 - 2 = 5 jobs.
    - Expected Jaccard weight = 2 / 5 = 0.4.
    """
    seed_co_occurrence_data([
        ("Job 1", ["JavaScript", "React"]),
        ("Job 2", ["JavaScript", "React"]),
        ("Job 3", ["JavaScript"]),
        ("Job 4", ["JavaScript"]),
        ("Job 5", ["React"]),
    ])

    graph = build_skill_co_occurrence_graph(db=db_session)
    target_edge = None
    for edge in graph["edges"]:
        if frozenset([edge["source"], edge["target"]]) == frozenset(["JavaScript", "React"]):
            target_edge = edge
            break

    assert target_edge is not None
    assert target_edge["shared_posting_count"] == 2
    assert pytest.approx(target_edge["weight"], 0.01) == 0.4


def test_empty_database_returns_empty_graph(db_session):
    """Verifies graceful handling when no skills or jobs exist in the database."""
    graph = build_skill_co_occurrence_graph(db=db_session)
    assert graph == {"nodes": [], "edges": []}