"""Semantic role resolution.

`Job.title.ilike(f"%{role}%")` (used throughout recommend.py, match_score.py,
role_graph.py, and the /predict-salary endpoint) is exact substring matching —
"ML Engineer" finds nothing against postings titled "Machine Learning
Engineer". resolve_role() maps a free-text query to the closest tracked role
by embedding similarity, so callers can substring-match against the resolved
canonical name instead of the user's raw phrasing.

Fails open: if the embedding model can't be loaded (e.g. no network on first
run before it's cached), resolve_role() returns the query untouched — the
system degrades to today's substring-only behavior, it doesn't break.
"""
from role_graph import TRACKED_ROLES

# Calibrated against real CI runs (see test_role_matcher.py), not guessed:
# short acronyms don't embed close enough to their expansion for a generic
# sentence model to catch reliably ("SRE" scored 0.248 against "site
# reliability engineer" — nowhere near any reasonable threshold), and some
# common tech-industry phrasings are worth mapping explicitly rather than
# hoping the embedding lands right ("React Developer" scored 0.548, just
# under threshold, for "frontend developer"). Checked before the model at
# all — zero embedding cost for these.
ROLE_ALIASES = {
    "sre": "site reliability engineer",
    "react developer": "frontend developer",
}

# 0.6, not 0.55: real CI data showed "Growth Marketing Manager" incorrectly
# matching "product manager" at 0.576 — a threshold has to clear that with
# margin, or it starts resolving genuinely unrelated roles.
SIMILARITY_THRESHOLD = 0.6

_model = None
_model_load_failed = False
_role_embeddings = None


def _load_model():
    global _model, _model_load_failed, _role_embeddings
    if _model is not None or _model_load_failed:
        return
    try:
        from sentence_transformers import SentenceTransformer

        _model = SentenceTransformer("all-MiniLM-L6-v2")
        _role_embeddings = _model.encode(TRACKED_ROLES, normalize_embeddings=True)
    except Exception:
        _model_load_failed = True


def resolve_role(query: str) -> dict:
    """Returns {"resolved": str, "matched_semantically": bool, "similarity": float | None}.

    `resolved` is what callers should substring-match against. `similarity`
    is None when no embedding comparison happened (exact match already found,
    or the model isn't available).
    """
    query_lower = query.strip().lower()
    if query_lower in TRACKED_ROLES:
        return {"resolved": query_lower, "matched_semantically": False, "similarity": None}
    if query_lower in ROLE_ALIASES:
        return {"resolved": ROLE_ALIASES[query_lower], "matched_semantically": True, "similarity": None}

    _load_model()
    if _model is None:
        return {"resolved": query, "matched_semantically": False, "similarity": None}

    from sentence_transformers import util

    query_embedding = _model.encode([query], normalize_embeddings=True)
    scores = util.cos_sim(query_embedding, _role_embeddings)[0]
    best_idx = int(scores.argmax())
    best_score = float(scores[best_idx])

    if best_score >= SIMILARITY_THRESHOLD:
        return {"resolved": TRACKED_ROLES[best_idx], "matched_semantically": True, "similarity": round(best_score, 3)}
    return {"resolved": query, "matched_semantically": False, "similarity": round(best_score, 3)}
