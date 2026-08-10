"""Seeds a handful of fixture rows so the pytest suite has data to query.

This is NOT part of the real data pipeline (see fetch_adzuna.py / load_data.py /
extract_skillner.py for that) — it exists purely so CI can run the test suite
against an empty, freshly-created database.
"""
from datetime import date
from models import Base, engine, session, Company, Job, Skill, JobSkill

Base.metadata.create_all(engine)

if session.query(Job).count() > 0:
    print("Data already present, skipping seed.")
else:
    acme = Company(name="Acme Corp")
    session.add(acme)
    session.flush()

    job1 = Job(
        external_id="seed-1",
        title="Senior Data Scientist",
        company_id=acme.id,
        location="Remote",
        description="Seed fixture posting for a data scientist role.",
        category="IT Jobs",
        source="seed",
        posted_date=date(2026, 7, 15),
    )
    job2 = Job(
        external_id="seed-2",
        title="Backend Software Engineer",
        company_id=acme.id,
        location="Remote",
        description="Seed fixture posting for a software engineer role.",
        category="IT Jobs",
        source="seed",
        posted_date=date(2026, 7, 20),
    )
    session.add_all([job1, job2])
    session.flush()

    skill_names = ["Python", "SQL", "Docker", "React", "Node.js"]
    skills = {name: Skill(name=name) for name in skill_names}
    session.add_all(skills.values())
    session.flush()

    job_skills = {
        job1: ["Python", "SQL", "Docker"],
        job2: ["Python", "React", "Node.js"],
    }
    for job, names in job_skills.items():
        for name in names:
            session.add(JobSkill(job_id=job.id, skill_id=skills[name].id))

    session.commit()
    print("Seeded fixture data.")
