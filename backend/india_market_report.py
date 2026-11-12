"""Read-only India coverage and skill counts from canonical PostgreSQL jobs."""
import argparse
from datetime import datetime, timedelta, timezone
import json

from sqlalchemy import distinct, func, or_, select

from job_normalization import INDIA_CITIES, OTHER_INDIA_CITIES
from models import IngestionRun, Job, JobObservation, JobSkill, SessionLocal, Skill

GEO_SCOPES = ("india_based", "india_eligible_remote", "international_only_remote", "unknown")
FRESHNESS_DAYS = 30


def fresh_observation(as_of):
    cutoff = as_of - timedelta(days=FRESHNESS_DAYS)
    return (
        select(JobObservation.id)
        .where(
            JobObservation.job_id == Job.id,
            JobObservation.last_observed_at.between(cutoff, as_of),
            or_(JobObservation.expires_at.is_(None), JobObservation.expires_at > as_of),
        )
        .exists()
    )


def market_report(db, as_of, scopes, start=None, end=None):
    """Use one canonical job for the coverage denominator and skill numerator."""
    geo = func.coalesce(Job.geography, "unknown")
    fresh = fresh_observation(as_of)
    observed = select(JobObservation.id).where(
        JobObservation.job_id == Job.id, JobObservation.last_observed_at <= as_of,
    ).exists()
    population = [Job.source.notin_(("seed", "demo", "test")), ~Job.external_id.like("demo-%"), ~Job.external_id.like("seed-%")]
    if start is not None:
        population.append(Job.posted_date >= start)
    if end is not None:
        population.append(Job.posted_date < end)

    rows = db.execute(
        select(geo, Job.market_city, func.count(Job.id), func.count(Job.id).filter(fresh),
               func.count(Job.id).filter(observed))
        .where(*population).group_by(geo, Job.market_city)
    ).all()
    coverage = {scope: dict.fromkeys(("stored", "recently_observed", "stale_or_expired", "collection_unknown"), 0)
                for scope in GEO_SCOPES}
    cities = {name: coverage["india_based"].copy() for name in (*INDIA_CITIES, *OTHER_INDIA_CITIES, "unresolved_city")}
    for geography, city, stored, recent, known in rows:
        buckets = [coverage[geography]]
        if geography == "india_based":
            buckets.append(cities.get(city, cities["unresolved_city"]))
        for bucket in buckets:
            bucket["stored"] += stored
            bucket["recently_observed"] += recent
            bucket["stale_or_expired"] += known - recent
            bucket["collection_unknown"] += stored - known

    cohort = [*population, geo.in_(scopes), fresh]
    denominator = db.scalar(select(func.count(Job.id)).where(*cohort))
    skill = func.lower(Skill.name)
    opportunities = func.count(distinct(Job.id))
    skill_counts = db.execute(
        select(skill, opportunities)
        .join(JobSkill, JobSkill.skill_id == Skill.id)
        .join(Job, Job.id == JobSkill.job_id)
        .where(*cohort).group_by(skill).order_by(opportunities.desc(), skill).limit(30)
    ).all()

    sources = {}
    for source in ("adzuna", "remoteok"):
        latest = db.scalar(
            select(IngestionRun).where(IngestionRun.source == source)
            .order_by(IngestionRun.finished_at.desc(), IngestionRun.id.desc()).limit(1)
        )
        success = db.scalar(
            select(IngestionRun).where(
                IngestionRun.source == source, IngestionRun.status == "success",
            ).order_by(IngestionRun.finished_at.desc(), IngestionRun.id.desc()).limit(1)
        )
        sources[source] = {
            "last_successful_ingestion": success.finished_at.isoformat() if success else None,
            "last_successful_country": success.requested_country if success else None,
            "last_run": {
                "at": latest.finished_at.isoformat(), "status": latest.status, "metrics": latest.metrics,
                "requested_country": latest.requested_country,
            } if latest else None,
        }
    return {
        "as_of": as_of.isoformat(),
        "freshness_window_days": FRESHNESS_DAYS,
        "observation_period_start": (as_of - timedelta(days=FRESHNESS_DAYS)).isoformat(),
        "posting_period_start": start.isoformat() if start else None,
        "posting_period_end_exclusive": end.isoformat() if end else None,
        "coverage": coverage,
        "india_city_coverage": cities,
        "skill_demand": {
            "geography": list(scopes),
            "opportunities": denominator,
            "skills": [{"skill": name, "opportunities": count} for name, count in skill_counts],
        },
        "sources": sources,
    }


if __name__ == "__main__":
    from datetime import date
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--geography", choices=GEO_SCOPES, action="append")
    parser.add_argument("--posted-from", type=date.fromisoformat)
    parser.add_argument("--posted-before", type=date.fromisoformat)
    args = parser.parse_args()
    if args.posted_from and args.posted_before and args.posted_from >= args.posted_before:
        parser.error("--posted-before must be later than --posted-from")
    with SessionLocal() as session:
        print(json.dumps(market_report(
            session, datetime.now(timezone.utc),
            args.geography or GEO_SCOPES[:2], args.posted_from, args.posted_before,
        ), indent=2))
