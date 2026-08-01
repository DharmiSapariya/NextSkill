import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, Company, Job

DATABASE_URL = "postgresql+psycopg2://jobintel:localdevpassword@localhost:5433/job_market"

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

with open("raw_jobs_adzuna.json") as f:
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
