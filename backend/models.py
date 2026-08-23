from sqlalchemy import create_engine, Column, Integer, String, Text, Date, DateTime, ForeignKey, Numeric, JSON, UniqueConstraint, Boolean
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from datetime import datetime, timezone
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql+psycopg2://jobintel:localdevpassword@localhost:5433/job_market"
)

Base = declarative_base()

class Company(Base):
    __tablename__ = "companies"
    __table_args__ = (UniqueConstraint("name", name="uq_companies_name"),)
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)

class Job(Base):
    __tablename__ = "jobs"
    id = Column(Integer, primary_key=True)
    external_id = Column(String, unique=True, nullable=False)
    title = Column(String, nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"))
    location = Column(String)
    description = Column(Text)
    category = Column(String)
    source = Column(String, nullable=False)
    posted_date = Column(Date)
    salary_min = Column(Numeric, nullable=True)
    salary_max = Column(Numeric, nullable=True)

    company = relationship("Company")

class Skill(Base):
    __tablename__ = "skills"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)

class JobSkill(Base):
    __tablename__ = "job_skills"
    __table_args__ = (UniqueConstraint("job_id", "skill_id", name="uq_job_skills_job_id_skill_id"),)
    id = Column(Integer, primary_key=True)
    # No separate index=True on job_id: the unique constraint above already
    # creates a composite (job_id, skill_id) index, which Postgres can use
    # for job_id-only lookups via the leftmost-prefix rule.
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.id"), nullable=False, index=True)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    skills = Column(JSON, nullable=False, default=list)
    is_admin = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class RecommendationHistory(Base):
    """One row per /recommend or /recommend/evidence call — lets a user see
    how their skill gap for a role has changed over time, not just a single
    point-in-time snapshot."""
    __tablename__ = "recommendation_history"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    target_role = Column(String, nullable=False)
    resolved_role = Column(String, nullable=False)
    skills_at_time = Column(JSON, nullable=False)
    recommendations = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    user = relationship("User")

class SharedReport(Base):
    """A user-chosen publicly-viewable snapshot of one RecommendationHistory
    entry — Phase 4's "shareable public skill-report pages," a link instead
    of a login-gated result. Deliberately a separate table and an explicit
    action (POST /auth/me/history/{id}/share), not every /recommend call
    auto-shareable: a user's full history is private by default, only what
    they choose to publish is public."""
    __tablename__ = "shared_reports"
    id = Column(Integer, primary_key=True)
    token = Column(String, unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    target_role = Column(String, nullable=False)
    resolved_role = Column(String, nullable=False)
    skills_at_time = Column(JSON, nullable=False)
    recommendations = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User")

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

if __name__ == "__main__":
    # Quick local/throwaway-DB setup only (e.g. seed_test_data.py, fresh dev DB).
    # A real deployment — anywhere the schema needs to evolve without dropping
    # data — goes through Alembic instead: `cd backend && alembic upgrade head`.
    # See migrations/.
    Base.metadata.create_all(engine)
    print("Tables created successfully")
