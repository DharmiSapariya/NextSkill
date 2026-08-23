"""Tests for semantic role resolution (role_matcher.py).

Split into two groups:
- Alias-path and exact-match tests: pure logic, no network, always run.
- Embedding-path tests: need to download the sentence-transformer model from
  HuggingFace on first run — need real internet access to huggingface.co.
  Marked to skip automatically if that's unavailable (e.g. this project's dev
  sandbox blocks egress to huggingface.co) rather than failing the whole
  suite over an environment constraint unrelated to the code's correctness.

Real numbers from the first CI run that actually exercised this (network
was reachable there, unlike the sandbox this was developed in) — this is why
ROLE_ALIASES and SIMILARITY_THRESHOLD (0.6, not the original 0.55) look the
way they do:
    'SRE' vs 'site reliability engineer'          -> similarity 0.248 (too low to ever thread a threshold)
    'React Developer' vs 'frontend developer'      -> similarity 0.548 (just under the original 0.55)
    'Growth Marketing Manager' vs 'product manager' -> similarity 0.576 (false positive at 0.55)
"""
import pytest

from role_matcher import resolve_role


def _model_available():
    try:
        probe = resolve_role("ML Engineer")  # not an alias or exact match — forces a real embedding call
        return probe["similarity"] is not None
    except Exception:
        return False


needs_model = pytest.mark.skipif(
    not _model_available(),
    reason="sentence-transformers model unreachable (no network access to huggingface.co in this environment)",
)


def test_exact_match_short_circuits_without_embedding():
    result = resolve_role("Data Scientist")
    assert result == {"resolved": "data scientist", "matched_semantically": False, "similarity": None}


@pytest.mark.parametrize(
    "query,expected_role",
    [
        ("SRE", "site reliability engineer"),
        ("sre", "site reliability engineer"),
        ("React Developer", "frontend developer"),
    ],
)
def test_known_aliases_resolve_without_the_embedding_model(query, expected_role):
    """ROLE_ALIASES in role_matcher.py — cases the embedding model demonstrably
    doesn't handle well on its own (see this file's module docstring for the
    real numbers that motivated adding them)."""
    result = resolve_role(query)
    assert result["resolved"] == expected_role
    assert result["matched_semantically"] is True
    assert result["similarity"] is None  # alias path, not an embedding comparison


@needs_model
@pytest.mark.parametrize(
    "query,expected_role",
    [
        ("ML Engineer", "machine learning engineer"),
        ("Frontend Dev", "frontend developer"),
        ("Backend Dev", "backend developer"),
    ],
)
def test_common_phrasings_resolve_via_the_embedding_model(query, expected_role):
    result = resolve_role(query)
    assert result["resolved"] == expected_role, (
        f"{query!r} resolved to {result['resolved']!r} (similarity={result['similarity']}), "
        f"expected {expected_role!r} — SIMILARITY_THRESHOLD in role_matcher.py may need tuning"
    )
    assert result["matched_semantically"] is True


@needs_model
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
