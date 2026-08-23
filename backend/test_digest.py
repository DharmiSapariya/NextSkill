import itertools
import uuid
from datetime import datetime, timedelta, timezone

from digest import compute_digest_for_user
from models import RecommendationHistory, User, session

# Direct DB inserts happen far faster than the HTTP-call-based tests
# elsewhere in this suite (no request round-trip between them) — relying on
# wall-clock datetime.now() for ordering risks same-microsecond ties on a
# fast machine. Explicit, strictly increasing timestamps instead.
_next_offset = itertools.count()


def _make_user() -> int:
    user = User(email=f"digest-{uuid.uuid4().hex[:12]}@nextskill.dev", hashed_password="x", skills=[])
    session.add(user)
    session.commit()
    return user.id


def _add_run(user_id: int, resolved_role: str, top_skill: str):
    created_at = datetime(2026, 1, 1, tzinfo=timezone.utc) + timedelta(seconds=next(_next_offset))
    session.add(RecommendationHistory(
        user_id=user_id,
        target_role=resolved_role,
        resolved_role=resolved_role,
        skills_at_time=[],
        recommendations=[{"skill": top_skill, "mentions": 10}],
        created_at=created_at,
    ))
    session.commit()


def test_no_history_produces_no_changes():
    user_id = _make_user()
    assert compute_digest_for_user(user_id) == []


def test_single_run_for_a_role_produces_no_change_yet():
    user_id = _make_user()
    _add_run(user_id, "data scientist", "Python")
    assert compute_digest_for_user(user_id) == []


def test_same_top_skill_across_consecutive_runs_is_not_a_change():
    user_id = _make_user()
    _add_run(user_id, "data scientist", "Python")
    _add_run(user_id, "data scientist", "Python")
    assert compute_digest_for_user(user_id) == []


def test_different_top_skill_across_consecutive_runs_is_a_change():
    user_id = _make_user()
    _add_run(user_id, "data scientist", "Python")
    _add_run(user_id, "data scientist", "SQL")

    changes = compute_digest_for_user(user_id)
    assert len(changes) == 1
    assert changes[0]["resolved_role"] == "data scientist"
    assert changes[0]["previous_top_gap_skill"] == "Python"
    assert changes[0]["current_top_gap_skill"] == "SQL"


def test_compares_latest_two_runs_not_first_and_latest():
    # Three runs: Python -> SQL -> Python. The overall first-vs-latest
    # comparison would show no change; this digest cares about the most
    # recent transition only (SQL -> Python), which IS a change.
    user_id = _make_user()
    _add_run(user_id, "data scientist", "Python")
    _add_run(user_id, "data scientist", "SQL")
    _add_run(user_id, "data scientist", "Python")

    changes = compute_digest_for_user(user_id)
    assert len(changes) == 1
    assert changes[0]["previous_top_gap_skill"] == "SQL"
    assert changes[0]["current_top_gap_skill"] == "Python"


def test_only_roles_with_a_real_change_are_reported():
    user_id = _make_user()
    _add_run(user_id, "data scientist", "Python")
    _add_run(user_id, "data scientist", "SQL")  # changed
    _add_run(user_id, "backend developer", "Docker")
    _add_run(user_id, "backend developer", "Docker")  # unchanged

    changes = compute_digest_for_user(user_id)
    assert len(changes) == 1
    assert changes[0]["resolved_role"] == "data scientist"


def test_users_digests_are_independent():
    user_a = _make_user()
    user_b = _make_user()
    _add_run(user_a, "data scientist", "Python")
    _add_run(user_a, "data scientist", "SQL")

    assert compute_digest_for_user(user_a) != []
    assert compute_digest_for_user(user_b) == []
