import re
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Job, Skill, JobSkill
from skills_taxonomy import SKILLS_TAXONOMY

DATABASE_URL = "postgresql+psycopg2://jobintel:localdevpassword@localhost:5433/job_market"

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

skill_objects = {}
for skill_name in SKILLS_TAXONOMY:
    skill = session.query(Skill).filter_by(name=skill_name).first()
    if not skill:
        skill = Skill(name=skill_name)
        session.add(skill)
        session.flush()
    skill_objects[skill_name] = skill
session.commit()

# Clear out the bad matches from the last run before redoing it properly
session.query(JobSkill).delete()
session.commit()

jobs = session.query(Job).all()
total_matches = 0

for job in jobs:
    if not job.description:
        continue
    description = job.description

    for skill_name, skill in skill_objects.items():
        # \b = word boundary: matches "R" as its own word, not inside "Order"
        pattern = r'\b' + re.escape(skill_name) + r'\b'
        if re.search(pattern, description, re.IGNORECASE):
            session.add(JobSkill(job_id=job.id, skill_id=skill.id))
            total_matches += 1

session.commit()
print(f"Found {total_matches} skill mentions across {len(jobs)} jobs")
