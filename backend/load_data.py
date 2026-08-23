import json
from models import Company, Job, session

INPUT_FILE = "raw_jobs_adzuna.json"


def load_postings(input_file: str = INPUT_FILE) -> tuple[int, int]:
    """Loads postings from a raw Adzuna JSON dump into Postgres, idempotently
    (skips postings already present by external_id). Returns (inserted, skipped)."""
    with open(input_file) as f:
        data = json.load(f)

    results = data.get("results", [])
    inserted = 0
    skipped = 0

    for item in results:
        external_id = str(item.get("id"))

        existing = session.query(Job).filter_by(external_id=external_id).first()
        if existing:
            skipped += 1
            continue

        company_name = item.get("company", {}).get("display_name", "Unknown")
        company = session.query(Company).filter_by(name=company_name).first()
        if not company:
            company = Company(name=company_name)
            session.add(company)
            session.flush()

        job = Job(
            external_id=external_id,
            title=item.get("title", "").replace("&amp;", "&"),
            company_id=company.id,
            location=item.get("location", {}).get("display_name"),
            description=item.get("description"),
            category=item.get("category", {}).get("label"),
            source="adzuna",
            posted_date=item.get("created", "")[:10] or None,
            salary_min=item.get("salary_min"),
            salary_max=item.get("salary_max"),
        )
        session.add(job)
        inserted += 1

    session.commit()
    print(f"Inserted {inserted} new jobs, skipped {skipped} duplicates")
    return inserted, skipped


if __name__ == "__main__":
    load_postings()
