from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker
from models import Skill, JobSkill

DATABASE_URL = "postgresql+psycopg2://jobintel:localdevpassword@localhost:5433/job_market"
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

all_skills = session.query(Skill).all()

# Group skills by lowercase name to find case-variant duplicates
groups = {}
for skill in all_skills:
    key = skill.name.lower()
    groups.setdefault(key, []).append(skill)

merged_count = 0
for key, skills in groups.items():
    if len(skills) <= 1:
        continue

    # Keep the first one, merge the rest into it
    primary = skills[0]
    for duplicate in skills[1:]:
        job_skills = session.query(JobSkill).filter_by(skill_id=duplicate.id).all()
        for js in job_skills:
            exists = session.query(JobSkill).filter_by(job_id=js.job_id, skill_id=primary.id).first()
            if not exists:
                js.skill_id = primary.id
            else:
                session.delete(js)
        session.delete(duplicate)
        merged_count += 1

session.commit()
print(f"Merged {merged_count} duplicate skill entries")
