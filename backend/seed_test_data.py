"""Seeds fixture rows so the pytest suite has data to query.

This is NOT part of the real data pipeline (see fetch_adzuna.py / load_data.py /
extract_skillner.py for that) — it exists purely so CI can run the test suite,
including the resume-match, salary-prediction, and role-transition-graph
features, against an empty, freshly-created database.
"""
import random
from datetime import date

from models import Base, engine, session, Company, Job, Skill, JobSkill

Base.metadata.create_all(engine)
random.seed(42)

# Original minimal fixture — kept as-is so existing tests keep their exact
# expectations (e.g. skill_trend's total_mentions, related_skills' React case).
BASE_JOBS = [
    {
        "external_id": "seed-1",
        "title": "Senior Data Scientist",
        "posted_date": date(2026, 7, 15),
        "skills": ["Python", "SQL", "Docker"],
    },
    {
        "external_id": "seed-2",
        "title": "Backend Software Engineer",
        "posted_date": date(2026, 7, 20),
        "skills": ["Python", "React", "Node.js"],
    },
]

# Broader multi-role, salary-labeled fixture so /match-score, /predict-salary,
# and /roles/transition-graph have something realistic to work against.
ROLE_SKILLS = {
    "data scientist": ["Python", "SQL", "Pandas", "scikit-learn", "Machine Learning", "TensorFlow"],
    "data analyst": ["Python", "SQL", "Pandas", "Data Visualization", "Excel"],
    "data engineer": ["Python", "SQL", "Docker", "Kubernetes", "AWS"],
    "machine learning engineer": ["Python", "TensorFlow", "PyTorch", "Docker", "Machine Learning", "AWS"],
    "backend developer": ["Python", "SQL", "Docker", "REST API", "PostgreSQL", "Node.js"],
    "frontend developer": ["React", "JavaScript", "TypeScript", "CSS", "HTML"],
    "full stack developer": ["React", "Node.js", "SQL", "JavaScript", "Docker"],
    "devops engineer": ["Docker", "Kubernetes", "AWS", "Terraform", "CI/CD", "Linux"],
}

SALARY_RANGES = {
    "data scientist": (110000, 160000),
    "data analyst": (70000, 100000),
    "data engineer": (115000, 165000),
    "machine learning engineer": (130000, 180000),
    "backend developer": (100000, 145000),
    "frontend developer": (95000, 135000),
    "full stack developer": (100000, 145000),
    "devops engineer": (110000, 155000),
}

POSTINGS_PER_ROLE = 15


def _get_skill(cache, name):
    if name not in cache:
        skill = session.query(Skill).filter_by(name=name).first()
        if not skill:
            skill = Skill(name=name)
            session.add(skill)
            session.flush()
        cache[name] = skill
    return cache[name]


if session.query(Job).count() > 0:
    print("Data already present, skipping seed.")
else:
    acme = Company(name="Acme Corp")
    session.add(acme)
    session.flush()

    skill_cache = {}

    for job_data in BASE_JOBS:
        job = Job(
            external_id=job_data["external_id"],
            title=job_data["title"],
            company_id=acme.id,
            location="Remote",
            description=f"Seed fixture posting: {job_data['title']}.",
            category="IT Jobs",
            source="seed",
            posted_date=job_data["posted_date"],
        )
        session.add(job)
        session.flush()
        for skill_name in job_data["skills"]:
            session.add(JobSkill(job_id=job.id, skill_id=_get_skill(skill_cache, skill_name).id))

    job_count = len(BASE_JOBS)
    for role, skills in ROLE_SKILLS.items():
        low, high = SALARY_RANGES[role]
        for i in range(POSTINGS_PER_ROLE):
            job_count += 1
            salary_mid = random.randint(low, high)
            job = Job(
                external_id=f"seed-role-{job_count}",
                title=f"{role.title()} {i}",
                company_id=acme.id,
                location="Remote",
                description=f"Seed fixture posting for {role}.",
                category="IT Jobs",
                source="seed",
                posted_date=date(2026, 7, random.randint(1, 28)),
                salary_min=salary_mid - 8000,
                salary_max=salary_mid + 8000,
            )
            session.add(job)
            session.flush()

            chosen_skills = random.sample(skills, k=random.randint(3, len(skills)))
            for skill_name in chosen_skills:
                session.add(JobSkill(job_id=job.id, skill_id=_get_skill(skill_cache, skill_name).id))

    session.commit()
    print(f"Seeded {job_count} jobs ({len(BASE_JOBS)} base + {job_count - len(BASE_JOBS)} multi-role with salary data).")
