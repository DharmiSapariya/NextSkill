"""Tests for semantic role resolution (role_matcher.py).

Split into two groups:
- Fast unit tests (Exact matches, explicit aliases, and mocked vector similarity).
- Live model integration tests (requires network connectivity to HuggingFace hub).
"""

from unittest.mock import patch
import pytest

from role_matcher import resolve_role


def _check_huggingface_model_accessible() -> bool:
    """Lazy evaluation helper to detect offline environment constraints."""
    try:
        probe = resolve_role("ML Engineer")
        return probe.get("similarity") is not None
    except Exception:
        return False


# Skip marker evaluated lazily when integration specs run
requires_hf_model = pytest.mark.skipif(
    not _check_huggingface_model_accessible(),
    reason="SentenceTransformer model unreachable — skipping live embedding tests.",
)


# --- Pure Logic & Alias Tests (Fast, Network-Free) ---

def test_exact_match_short_circuits_without_embedding():
    """Verifies exact string equality bypassing vector embedding calls."""
    result = resolve_role("Data Scientist")
    assert result == {
        "resolved": "data scientist",
        "matched_semantically": False,
        "similarity": None,
    }


@pytest.mark.parametrize(
    "query,expected_role",
    [
        ("SRE", "site reliability engineer"),
        ("sre", "site reliability engineer"),
        ("React Developer", "frontend developer"),
    ],
)
def test_known_aliases_resolve_without_the_embedding_model(query, expected_role):
    """Verifies domain alias mapping overrides without invoking embedding models."""
    result = resolve_role(query)
    assert result["resolved"] == expected_role
    assert result["matched_semantically"] is True
    assert result["similarity"] is None


def test_embedding_path_with_mocked_similarity():
    """Verifies vector search routing and threshold decision logic using mocked embeddings."""
    mock_embeddings = {
        "ML Specialist": ("machine learning engineer", 0.85),
        "Growth Specialist": ("product manager", 0.35),
    }

    def _mock_compute_similarity(query: str):
        return mock_embeddings.get(query, (None, 0.0))

    with patch("role_matcher._find_best_vector_match", side_effect=_mock_compute_similarity):
        # Above threshold match
        high_sim = resolve_role("ML Specialist")
        assert high_sim["resolved"] == "machine learning engineer"
        assert high_sim["matched_semantically"] is True
        assert high_sim["similarity"] == 0.85

        # Below threshold match (unresolved fallback)
        low_sim = resolve_role("Growth Specialist")
        assert low_sim["matched_semantically"] is False


# --- Live Transformer Model Integration Specs ---

@requires_hf_model
@pytest.mark.parametrize(
    "query,expected_role",
    [
        ("ML Engineer", "machine learning engineer"),
        ("Frontend Dev", "frontend developer"),
        ("Backend Dev", "backend developer"),
    ],
)
def test_common_phrasings_resolve_via_live_embedding_model(query, expected_role):
    """Integration check ensuring live model yields expected role matches given SIMILARITY_THRESHOLD."""
    result = resolve_role(query)
    assert result["resolved"] == expected_role, (
        f"{query!r} resolved to {result['resolved']!r} (similarity={result['similarity']}), "
        f"expected {expected_role!r} — check SIMILARITY_THRESHOLD tuning."
    )
    assert result["matched_semantically"] is True


@requires_hf_model
def test_unrelated_query_does_not_force_a_match():
    """Integration check verifying out-of-domain queries do not yield false positive matches."""
    result = resolve_role("Growth Marketing Manager")
    assert not result["matched_semantically"], (
        f"'Growth Marketing Manager' incorrectly matched {result.get('resolved')!r} "
        f"(similarity={result.get('similarity')}) — SIMILARITY_THRESHOLD is too low."
    )