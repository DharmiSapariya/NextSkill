from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import func
from models import Job, Skill, JobSkill

DATABASE_URL = "postgresql+psycopg2://jobintel:localdevpassword@localhost:5433/job_market"
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

def recommend_skills(user_skills, target_role_keyword, top_n=10):
    user_skills_lower = {s.lower() for s in user_skills}
    role_words = set(target_role_keyword.lower().split())

    results = (
        session.query(Skill.name, func.count(JobSkill.id).label("mentions"))
        .join(JobSkill, JobSkill.skill_id == Skill.id)
        .join(Job, Job.id == JobSkill.job_id)
        .filter(Job.title.ilike(f"%{target_role_keyword}%"))
        .group_by(Skill.name)
        .order_by(func.count(JobSkill.id).desc())
        .all()
    )

    gaps = []
    for name, mentions in results:
        name_lower = name.lower()
        if name_lower in user_skills_lower:
            continue
        # Skip skills that are just the role name itself (e.g. "data science"
        # when targeting "data scientist") — not a genuine gap, just an echo.
        name_words = set(name_lower.split())
        if name_words and name_words.issubset(role_words | {"scientist", "science", "engineer", "engineering", "developer", "development"}):
            continue
        gaps.append((name, mentions))

    print(f"\nTarget role: '{target_role_keyword}'")
    print(f"Your skills: {', '.join(user_skills)}")
    print(f"\nTop {top_n} skills you're missing, ranked by demand:\n")
    for name, mentions in gaps[:top_n]:
        print(f"  {name:30s} — mentioned in {mentions} postings")

if __name__ == "__main__":
    recommend_skills(
        user_skills=["Python", "SQL"],
        target_role_keyword="data scientist",
    )

def recommend_skills_data(user_skills, target_role_keyword, top_n=10):
    """Same logic as recommend_skills, but returns structured data instead of printing."""
    user_skills_lower = {s.lower() for s in user_skills}
    role_words = set(target_role_keyword.lower().split())

    results = (
        session.query(Skill.name, func.count(JobSkill.id).label("mentions"))
        .join(JobSkill, JobSkill.skill_id == Skill.id)
        .join(Job, Job.id == JobSkill.job_id)
        .filter(Job.title.ilike(f"%{target_role_keyword}%"))
        .group_by(Skill.name)
        .order_by(func.count(JobSkill.id).desc())
        .all()
    )

    gaps = []
    for name, mentions in results:
        name_lower = name.lower()
        if name_lower in user_skills_lower:
            continue
        name_words = set(name_lower.split())
        if name_words and name_words.issubset(role_words | {"scientist", "science", "engineer", "engineering", "developer", "development"}):
            continue
        gaps.append({"skill": name, "postings_mentioning_it": mentions})

    return gaps[:top_n]
