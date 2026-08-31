import os
from datetime import datetime, timezone
from dotenv import load_dotenv

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    create_engine,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import (
    declarative_base,
    relationship,
    scoped_session,
    sessionmaker,
)

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://jobintel:localdevpassword@localhost:5433/job_market"
)

Base = declarative_base()


class Company(Base):
    __tablename__ = "companies"
    __table_args__ = (
        UniqueConstraint("name", name="uq_companies_name"),
    )

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)

    # Relationships
    jobs = relationship("Job", back_populates="company", cascade="all, delete-orphan")


class Job(Base):
    __tablename__ = "jobs"
    __table_args__ = (
        Index("ix_jobs_title_source", "title", "source"),
        Index("ix_jobs_company_id", "company_id"),
    )

    id = Column(Integer, primary_key=True)
    external_id = Column(String(255), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False, index=True)
    company_id = Column(
        Integer, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True
    )
    location = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    source = Column(String(50), nullable=False, index=True)
    posted_date = Column(Date, nullable=True, index=True)
    salary_min = Column(Numeric(12, 2), nullable=True)
    salary_max = Column(Numeric(12, 2), nullable=True)

    # Relationships
    company = relationship("Company", back_populates="jobs")
    job_skills = relationship("JobSkill", back_populates="job", cascade="all, delete-orphan")
    saved_by_users = relationship("SavedJob", back_populates="job", cascade="all, delete-orphan")


class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False, index=True)

    # Relationships
    job_skills = relationship("JobSkill", back_populates="skill", cascade="all, delete-orphan")


class JobSkill(Base):
    __tablename__ = "job_skills"
    __table_args__ = (
        UniqueConstraint("job_id", "skill_id", name="uq_job_skills_job_id_skill_id"),
    )

    id = Column(Integer, primary_key=True)
    job_id = Column(
        Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False
    )
    skill_id = Column(
        Integer, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Relationships
    job = relationship("Job", back_populates="job_skills")
    skill = relationship("Skill", back_populates="job_skills")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    skills = Column(JSONB, nullable=False, server_default="[]")
    is_admin = Column(Boolean, nullable=False, server_default="false")
    tier = Column(String(50), nullable=False, server_default="free")
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # Relationships
    history = relationship(
        "RecommendationHistory", back_populates="user", cascade="all, delete-orphan"
    )
    shared_reports = relationship(
        "SharedReport", back_populates="user", cascade="all, delete-orphan"
    )
    saved_jobs = relationship(
        "SavedJob", back_populates="user", cascade="all, delete-orphan"
    )


class RecommendationHistory(Base):
    __tablename__ = "recommendation_history"

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    target_role = Column(String(255), nullable=False)
    resolved_role = Column(String(255), nullable=False)
    skills_at_time = Column(JSONB, nullable=False)
    recommendations = Column(JSONB, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )

    # Relationships
    user = relationship("User", back_populates="history")


class SharedReport(Base):
    __tablename__ = "shared_reports"

    id = Column(Integer, primary_key=True)
    token = Column(String(100), unique=True, nullable=False, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    target_role = Column(String(255), nullable=False)
    resolved_role = Column(String(255), nullable=False)
    skills_at_time = Column(JSONB, nullable=False)
    recommendations = Column(JSONB, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # Relationships
    user = relationship("User", back_populates="shared_reports")


class SavedJob(Base):
    __tablename__ = "saved_jobs"
    __table_args__ = (
        UniqueConstraint("user_id", "job_id", name="uq_saved_jobs_user_id_job_id"),
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    job_id = Column(
        Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # Relationships
    user = relationship("User", back_populates="saved_jobs")
    job = relationship("Job", back_populates="saved_by_users")


# Database Connection Factory
engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=10, max_overflow=20)

# Local session factory for request-scoped or task-scoped sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Scoped session for thread-safe CLI / background worker execution
db_session = scoped_session(SessionLocal)


def get_db():
    """FastAPI Dependency Injection for Request Session Lifecycle."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


if __name__ == "__main__":
    Base.metadata.create_all(engine)
    print("Database tables and indexes created successfully with cascade safety.")