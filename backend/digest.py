"""Computes the "what changed since you last checked" digest — Phase 4:
"weekly digest notifications... 'your target role's top gap skill just
changed,' the retention loop every one-shot tool in this space is missing."

This is deliberately just the computation, not email delivery. Sending a
real email needs SMTP/provider credentials this environment doesn't have
and can't provision — that's an external integration, not something to
fake. What's genuinely buildable and useful right now is the underlying
question a digest email would answer, exposed as GET /auth/me/digest so
it's independently useful today (a user, or eventually a scheduled job,
can poll it) and is exactly the payload a future email step would send
verbatim once real SMTP credentials exist.

Note this compares *consecutive* runs (latest vs. the one right before
it), unlike /auth/me/history/progress which compares the very first
recorded run against the latest. "Your top gap skill just changed" is
about what's new since last time you looked, not the whole history's
worth of change.
"""
import logging
from typing import Any, Optional
from sqlalchemy import func
from sqlalchemy.orm import Session

from models import RecommendationHistory

logger = logging.getLogger("nextskill.digest")


def _extract_top_skill(entry: RecommendationHistory) -> Optional[str]:
    """Safely extracts the primary top gap skill name from a recommendation entry."""
    recs = getattr(entry, "recommendations", None)
    if not recs or not isinstance(recs, list) or len(recs) == 0:
        return None
    first_rec = recs[0]
    if isinstance(first_rec, dict):
        return first_rec.get("skill")
    return None


def compute_digest_for_user(user_id: int, db: Session) -> list[dict[str, Any]]:
    """Computes changes in top gap skills between the two most recent runs for a user across all roles."""
    
    # 1. Fetch all distinct roles analyzed by the user
    resolved_roles = (
        db.query(RecommendationHistory.resolved_role)
        .filter(RecommendationHistory.user_id == user_id)
        .distinct()
        .all()
    )

    changes: list[dict[str, Any]] = []

    # 2. Compare the two most recent runs per role
    for (role,) in resolved_roles:
        entries = (
            db.query(RecommendationHistory)
            .filter(
                RecommendationHistory.user_id == user_id,
                RecommendationHistory.resolved_role == role,
            )
            .order_by(RecommendationHistory.created_at.desc())
            .limit(2)
            .all()
        )
        
        if len(entries) < 2:
            continue

        latest, previous = entries[0], entries[1]
        
        latest_top = _extract_top_skill(latest)
        previous_top = _extract_top_skill(previous)

        # Detect shift in primary target skill gap
        if latest_top != previous_top:
            changes.append({
                "resolved_role": role,
                "previous_top_gap_skill": previous_top,
                "current_top_gap_skill": latest_top,
                "previous_run_at": previous.created_at.isoformat() if previous.created_at else None,
                "latest_run_at": latest.created_at.isoformat() if latest.created_at else None,
            })

    return changes