import html
import json
import logging
import os
import time
from typing import Dict, List, Set, Tuple
from sqlalchemy.orm import Session

from models import Company, Job, SessionLocal

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("nextskill.loader.adzuna")

INPUT_FILE = os.getenv("ADZUNA_INPUT_FILE", "raw_jobs_adzuna.json")
BATCH_SIZE = 500


def clean_text(raw_text: str | None) -> str | None:
    """Safely decodes all HTML entities and strips whitespace."""
    if not raw_text:
        return None
    cleaned = html.unescape(raw_text).strip()
    return cleaned if cleaned else None


def load_postings(input_file: str = INPUT_FILE) -> Tuple[int, int]:
    """Loads postings from an Adzuna JSON dump into PostgreSQL using bulk pre-fetching
    and batched transactions to prevent N+1 query bottlenecks."""
    start_time = time.time()

    if not os.path.exists(input_file):
        logger.error(f"Target file {input_file} does not exist. Aborting import.")
        return 0, 0

    try:
        with open(input_file, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as exc:
        logger.error(f"Failed to read or decode {input_file}: {exc}")
        return 0, 0

    results: List[dict] = data.get("results", [])
    if not results:
        logger.warning(f"No job records found in {input_file}.")
        return 0, 0

    db: Session = SessionLocal()
    inserted = 0
    skipped = 0

    try:
        # 1. Collect all external IDs from payload to batch query existing entries
        incoming_external_ids = [
            str(item["id"]) for item in results if item.get("id")
        ]

        logger.info(f"Pre-fetching existing jobs across {len(incoming_external_ids)} payload IDs...")
        existing_job_ids: Set[str] = set(
            id_tuple[0]
            for id_tuple in db.query(Job.external_id)
            .filter(Job.external_id.in_(incoming_external_ids))
            .all()
        )

        # 2. Extract and pre-fetch all distinct companies to avoid N+1 queries
        payload_company_names = set()
        for item in results:
            comp_name = item.get("company", {}).get("display_name")
            cleaned_comp = clean_text(comp_name) or "Unknown"
            payload_company_names.add(cleaned_comp)

        existing_companies = (
            db.query(Company)
            .filter(Company.name.in_(payload_company_names))
            .all()
        )
        company_map: Dict[str, Company] = {c.name: c for c in existing_companies}

        # 3. Create missing companies in a single transaction
        new_companies: List[Company] = []
        for comp_name in payload_company_names:
            if comp_name not in company_map:
                new_comp = Company(name=comp_name)
                company_map[comp_name] = new_comp
                new_companies.append(new_comp)

        if new_companies:
            db.add_all(new_companies)
            db.flush()  # Populates primary key IDs for new companies
            logger.info(f"Created {len(new_companies)} new company records.")

        # 4. Process jobs in memory and commit in batches
        pending_jobs: List[Job] = []

        for item in results:
            external_id = str(item.get("id"))
            if not external_id or external_id in existing_job_ids:
                skipped += 1
                continue

            existing_job_ids.add(external_id)  # Avoid duplicates within same payload

            company_name = clean_text(item.get("company", {}).get("display_name")) or "Unknown"
            company = company_map[company_name]

            raw_posted_date = item.get("created", "")
            posted_date = raw_posted_date[:10] if len(raw_posted_date) >= 10 else None

            job = Job(
                external_id=external_id,
                title=clean_text(item.get("title")) or "Untitled Position",
                company_id=company.id,
                location=clean_text(item.get("location", {}).get("display_name")),
                description=clean_text(item.get("description")),
                category=clean_text(item.get("category", {}).get("label")),
                source="adzuna",
                posted_date=posted_date,
                salary_min=item.get("salary_min"),
                salary_max=item.get("salary_max"),
            )

            pending_jobs.append(job)
            inserted += 1

            # Commit batch to maintain a low memory footprint
            if len(pending_jobs) >= BATCH_SIZE:
                db.add_all(pending_jobs)
                db.commit()
                pending_jobs.clear()
                logger.info(f"Committed batch... Total inserted: {inserted}")

        # Final commit for remaining items
        if pending_jobs:
            db.add_all(pending_jobs)
            db.commit()

        elapsed = time.time() - start_time
        logger.info(
            f"Adzuna DB Sync Complete in {elapsed:.2f}s | "
            f"Inserted: {inserted} | Skipped: {skipped}"
        )
        return inserted, skipped

    except Exception as exc:
        db.rollback()
        logger.error(f"Critical error during database load: {exc}")
        raise exc
    finally:
        db.close()


if __name__ == "__main__":
    load_postings()