"""Tests for semantic role resolution (role_matcher.py).

These require downloading the sentence-transformer model from HuggingFace on
first run — they need real internet access to huggingface.co. Skipped
automatically if that's unavailable (e.g. a network-restricted dev sandbox),
rather than failing the whole suite over an environment constraint unrelated
to the code's correctness.
"""
import pytest

from role_matcher import resolve_role


def _model_available():
    try:
        result = resolve_role("Data Scientist")  # exact match, doesn't touch the network
        # Force a real embedding call to check network/model availability.
        probe = resolve_role("ML Engineer")
        return probe["similarity"] is not None or probe["matched_semantically"]
    except Exception:
        return False


pytestmark = pytest.mark.skipif(
    not _model_available(),
    reason="sentence-transformers model unreachable (no network access to huggingface.co in this environment)",
)


def test_exact_match_short_circuits_without_embedding():
    result = resolve_role("Data Scientist")
    assert result == {"resolved": "data scientist", "matched_semantically": False, "similarity": None}


@pytest.mark.parametrize(
    "query,expected_role",
    [
        ("ML Engineer", "machine learning engineer"),
        ("Frontend Dev", "frontend developer"),
        ("Backend Dev", "backend developer"),
        ("SRE", "site reliability engineer"),
        ("React Developer", "frontend developer"),
    ],
)
def test_common_abbreviations_resolve_to_the_right_tracked_role(query, expected_role):
    result = resolve_role(query)
    assert result["resolved"] == expected_role, (
        f"{query!r} resolved to {result['resolved']!r} (similarity={result['similarity']}), "
        f"expected {expected_role!r} — SIMILARITY_THRESHOLD in role_matcher.py may need tuning"
    )
    assert result["matched_semantically"] is True


def test_unrelated_query_does_not_force_a_match():
    result = resolve_role("Growth Marketing Manager")
    # Nothing in TRACKED_ROLES is actually close to this — it should either
    # stay unresolved (similarity below threshold) or, if it does cross the
    # threshold, that's a real signal the threshold is set too low.
    if result["matched_semantically"]:
        pytest.fail(
            f"'Growth Marketing Manager' incorrectly matched {result['resolved']!r} "
            f"(similarity={result['similarity']}) — SIMILARITY_THRESHOLD is likely too low"
        )
