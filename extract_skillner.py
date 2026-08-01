import time
import spacy
from spacy.matcher import PhraseMatcher
from skillNer.general_params import SKILL_DB
from skillNer.skill_extractor_class import SkillExtractor
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Job, Skill, JobSkill

print("Loading language model...")
nlp = spacy.load("en_core_web_lg")
skill_extractor = SkillExtractor(nlp, SKILL_DB, PhraseMatcher)

DATABASE_URL = "postgresql+psycopg2://jobintel:localdevpassword@localhost:5433/job_market"
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

# Clear out the old regex-based results — we're upgrading the extraction method,
# not mixing two different approaches together in the same table.
session.query(JobSkill).delete()
session.query(Skill).delete()
session.commit()

skill_cache = {}  # emsi skill_id -> our Skill row, avoids duplicate DB lookups

jobs = session.query(Job).filter(Job.description.isnot(None)).all()
print(f"Processing {len(jobs)} jobs...")

start = time.time()
total_matches = 0

for i, job in enumerate(jobs, 1):
    try:
        annotations = skill_extractor.annotate(job.description)
    except Exception as e:
        continue  # skip jobs that fail to parse rather than crash the whole run

    full_matches = annotations.get("results", {}).get("full_matches", [])

    for match in full_matches:
        emsi_id = match["skill_id"]
        skill_name = match["doc_node_value"]

        if emsi_id not in skill_cache:
            skill = session.query(Skill).filter_by(name=skill_name).first()
            if not skill:
                skill = Skill(name=skill_name)
                session.add(skill)
                session.flush()
            skill_cache[emsi_id] = skill

        skill = skill_cache[emsi_id]
        exists = session.query(JobSkill).filter_by(job_id=job.id, skill_id=skill.id).first()
        if not exists:
            session.add(JobSkill(job_id=job.id, skill_id=skill.id))
            total_matches += 1

    if i % 200 == 0:
        session.commit()
        elapsed = time.time() - start
        rate = i / elapsed
        remaining = (len(jobs) - i) / rate
        print(f"  {i}/{len(jobs)} done | {total_matches} matches so far | ~{remaining/60:.1f} min remaining")

session.commit()
elapsed = time.time() - start
print(f"\nDone in {elapsed/60:.1f} minutes. Found {total_matches} skill mentions across {len(jobs)} jobs")
