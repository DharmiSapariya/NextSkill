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
from models import RecommendationHistory, session


def compute_digest_for_user(user_id: int) -> list[dict]:
    resolved_roles = (
        session.query(RecommendationHistory.resolved_role)
        .filter_by(user_id=user_id)
        .distinct()
        .all()
    )

    changes = []
    for (role,) in resolved_roles:
        entries = (
            session.query(RecommendationHistory)
            .filter_by(user_id=user_id, resolved_role=role)
            .order_by(RecommendationHistory.created_at.desc())
            .limit(2)
            .all()
        )
        if len(entries) < 2:
            continue

        latest, previous = entries[0], entries[1]
        latest_top = latest.recommendations[0]["skill"] if latest.recommendations else None
        previous_top = previous.recommendations[0]["skill"] if previous.recommendations else None

        if latest_top != previous_top:
            changes.append({
                "resolved_role": role,
                "previous_top_gap_skill": previous_top,
                "current_top_gap_skill": latest_top,
                "previous_run_at": previous.created_at.isoformat(),
                "latest_run_at": latest.created_at.isoformat(),
            })

    return changes
