"""Posting provenance for an already-scoped Job query."""
from datetime import datetime, timezone

from sqlalchemy import case, func

from models import Job

POSTING_AGE_NOTICE_DAYS = 30


def posting_source(job):
    if job.external_id.startswith("demo-"):
        return "demo"
    return job.source.strip() or None


def older_than_notice(posted_date):
    if posted_date is None:
        return None
    return (datetime.now(timezone.utc).date() - posted_date).days > POSTING_AGE_NOTICE_DAYS


def summarize_postings(query):
    source = case(
        (Job.external_id.like("demo-%"), "demo"),
        else_=func.nullif(func.trim(Job.source), ""),
    ).label("source")
    location = func.nullif(func.trim(Job.location), "")
    rows = query.with_entities(
        source,
        func.count(Job.id),
        func.count(Job.posted_date),
        func.max(Job.posted_date),
        func.count(location),
        func.count(Job.id).filter(Job.location.op("~*")(r"\mremote\M")),
    ).group_by(source).all()
    latest = max((row[3] for row in rows if row[3] is not None), default=None)
    return {
        "posting_count": sum(row[1] for row in rows),
        "dated_posting_count": sum(row[2] for row in rows),
        "latest_posted_date": latest.isoformat() if latest else None,
        "collection_timestamp": None,
        "posting_age_notice_days": POSTING_AGE_NOTICE_DAYS,
        "latest_posting_older_than_notice": older_than_notice(latest),
        "location_text_count": sum(row[4] for row in rows),
        "remote_location_text_count": sum(row[5] for row in rows),
        "sources": [
            {"source": row[0], "posting_count": row[1]}
            for row in sorted(rows, key=lambda row: (-row[1], row[0] or ""))
        ],
    }
