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


def get_evidence_for_skill(skill_name, target_role_keyword, limit=3):
    """Return a few real postings that mention this skill, for the target role, as evidence."""
    skill = session.query(Skill).filter_by(name=skill_name).first()
    if not skill:
        return []

    postings = (
        session.query(Job)
        .join(JobSkill, JobSkill.job_id == Job.id)
        .filter(JobSkill.skill_id == skill.id)
        .filter(Job.title.ilike(f"%{target_role_keyword}%"))
        .limit(limit)
        .all()
    )

    return [
        {
            "title": p.title,
            "company": p.company.name if p.company else None,
            "location": p.location,
        }
        for p in postings
    ]


def recommend_skills_with_evidence(user_skills, target_role_keyword, top_n=5):
    """Same as recommend_skills_data, but attaches real posting evidence to each recommendation."""
    gaps = recommend_skills_data(user_skills, target_role_keyword, top_n=top_n)
    for gap in gaps:
        gap["evidence"] = get_evidence_for_skill(gap["skill"], target_role_keyword)
    return gaps
