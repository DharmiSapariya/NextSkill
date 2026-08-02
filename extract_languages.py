import re
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Job, Skill, JobSkill

DATABASE_URL = "postgresql+psycopg2://jobintel:localdevpassword@localhost:5433/job_market"
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

# Common single-word languages that skillNer's full_matches was found to miss entirely
LANGUAGES = [
    "Python", "Java", "JavaScript", "TypeScript", "Go", "Rust",
    "Swift", "Kotlin", "PHP", "Ruby", "Scala", "R", "C++", "C#",
]

skill_cache = {}
for name in LANGUAGES:
    skill = session.query(Skill).filter_by(name=name).first()
    if not skill:
        skill = Skill(name=name)
        session.add(skill)
        session.flush()
    skill_cache[name] = skill
session.commit()

jobs = session.query(Job).filter(Job.description.isnot(None)).all()
total_matches = 0

for job in jobs:
    for name, skill in skill_cache.items():
        pattern = r'\b' + re.escape(name) + r'\b'
        if re.search(pattern, job.description, re.IGNORECASE):
            exists = session.query(JobSkill).filter_by(job_id=job.id, skill_id=skill.id).first()
            if not exists:
                session.add(JobSkill(job_id=job.id, skill_id=skill.id))
                total_matches += 1

session.commit()
print(f"Added {total_matches} language mentions across {len(jobs)} jobs")
