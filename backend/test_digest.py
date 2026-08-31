"""Tests for digest.py — Recommendation history delta calculation service.

Covers user digest computation, role-level skill transition detection,
timestamp sequencing, and strict multi-user test isolation.
"""

import itertools
import uuid
from datetime import datetime, timedelta, timezone
from typing import Callable, List, Optional

import pytest

from digest import compute_digest_for_user
from models import RecommendationHistory, User, SessionLocal


# --- Pytest Fixtures & Helpers ---

@pytest.fixture
def db_session():
    """Provides a transactional database session rolled back automatically after every test."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def time_counter() -> Callable[[], datetime]:
    """Generates strictly monotonically increasing UTC timestamps per test execution."""
    base_time = datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    counter = itertools.count()
    return lambda: base_time + timedelta(seconds=next(counter))


@pytest.fixture
def create_user(db_session) -> Callable[[], User]:
    """Factory fixture to create isolated test users."""
    def _factory() -> User:
        user = User(
            email=f"digest-{uuid.uuid4().hex[:12]}@nextskill.dev",
            hashed_password="hashed_password_sample",
            skills=[],
        )
        db_session.add(user)
        db_session.flush()
        return user

    return _factory


@pytest.fixture
def add_recommendation_run(db_session, time_counter) -> Callable[[int, str, Optional[str]], RecommendationHistory]:
    """Factory fixture to record a historical recommendation run with precise timestamp ordering."""
    def _factory(user_id: int, resolved_role: str, top_skill: Optional[str] = None) -> RecommendationHistory:
        recommendations: List[dict] = []
        if top_skill:
            recommendations.append({"skill": top_skill, "mentions": 10})

        run = RecommendationHistory(
            user_id=user_id,
            target_role=resolved_role,
            resolved_role=resolved_role,
            skills_at_time=[],
            recommendations=recommendations,
            created_at=time_counter(),
        )
        db_session.add(run)
        db_session.flush()
        return run

    return _factory


# --- Digest Delta Detection Tests ---

def test_no_history_produces_no_changes(create_user, db_session):
    """Verifies that users with zero recommendation history return empty digests."""
    user = create_user()
    assert compute_digest_for_user(user.id, db_session) == []


def test_nonexistent_user_returns_empty_digest(db_session):
    """Verifies that invalid user IDs fail open gracefully with empty digests."""
    assert compute_digest_for_user(99999999, db_session) == []


def test_single_run_for_a_role_produces_no_change_yet(create_user, add_recommendation_run, db_session):
    """Verifies that a single run does not trigger a delta (requires >= 2 runs to compare)."""
    user = create_user()
    add_recommendation_run(user.id, "data scientist", "Python")
    assert compute_digest_for_user(user.id, db_session) == []


def test_same_top_skill_across_consecutive_runs_is_not_a_change(create_user, add_recommendation_run, db_session):
    """Verifies that identical top skills across consecutive runs produce zero digest entries."""
    user = create_user()
    add_recommendation_run(user.id, "data scientist", "Python")
    add_recommendation_run(user.id, "data scientist", "Python")
    assert compute_digest_for_user(user.id, db_session) == []


def test_different_top_skill_across_consecutive_runs_is_a_change(create_user, add_recommendation_run, db_session):
    """Verifies that shifting top skills between consecutive runs generates a delta payload."""
    user = create_user()
    add_recommendation_run(user.id, "data scientist", "Python")
    add_recommendation_run(user.id, "data scientist", "SQL")

    changes = compute_digest_for_user(user.id, db_session)
    assert len(changes) == 1
    assert changes[0]["resolved_role"] == "data scientist"
    assert changes[0]["previous_top_gap_skill"] == "Python"
    assert changes[0]["current_top_gap_skill"] == "SQL"


def test_compares_latest_two_runs_not_first_and_latest(create_user, add_recommendation_run, db_session):
    """Verifies that evaluation is strictly performed between N-1 and N runs (Python -> SQL -> Python)."""
    user = create_user()
    add_recommendation_run(user.id, "data scientist", "Python")
    add_recommendation_run(user.id, "data scientist", "SQL")
    add_recommendation_run(user.id, "data scientist", "Python")

    changes = compute_digest_for_user(user.id, db_session)
    assert len(changes) == 1
    assert changes[0]["resolved_role"] == "data scientist"
    assert changes[0]["previous_top_gap_skill"] == "SQL"
    assert changes[0]["current_top_gap_skill"] == "Python"


def test_only_roles_with_a_real_change_are_reported(create_user, add_recommendation_run, db_session):
    """Verifies that multi-role evaluations filter out unchanged roles and include changed ones."""
    user = create_user()
    # Data scientist role changes
    add_recommendation_run(user.id, "data scientist", "Python")
    add_recommendation_run(user.id, "data scientist", "SQL")
    # Backend developer role remains static
    add_recommendation_run(user.id, "backend developer", "Docker")
    add_recommendation_run(user.id, "backend developer", "Docker")

    changes = compute_digest_for_user(user.id, db_session)
    assert len(changes) == 1
    assert changes[0]["resolved_role"] == "data scientist"
    assert changes[0]["current_top_gap_skill"] == "SQL"


def test_empty_recommendation_payloads_handled_gracefully(create_user, add_recommendation_run, db_session):
    """Verifies that runs with empty skill lists do not cause index out-of-bounds exceptions."""
    user = create_user()
    add_recommendation_run(user.id, "data scientist", "Python")
    add_recommendation_run(user.id, "data scientist", top_skill=None)  # Empty recommendations

    changes = compute_digest_for_user(user.id, db_session)
    assert len(changes) == 1
    assert changes[0]["previous_top_gap_skill"] == "Python"
    assert changes[0]["current_top_gap_skill"] is None


def test_users_digests_are_independent(create_user, add_recommendation_run, db_session):
    """Verifies user state isolation; changes for user A do not pollute user B."""
    user_a = create_user()
    user_b = create_user()

    add_recommendation_run(user_a.id, "data scientist", "Python")
    add_recommendation_run(user_a.id, "data scientist", "SQL")

    assert len(compute_digest_for_user(user_a.id, db_session)) == 1
    assert compute_digest_for_user(user_b.id, db_session) == []