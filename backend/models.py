from sqlalchemy import create_engine, Column, Integer, String, Text, Date, DateTime, ForeignKey, Numeric, JSON
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
    id = Column(Integer, primary_key=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.id"), nullable=False)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    skills = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

if __name__ == "__main__":
    Base.metadata.create_all(engine)
    print("Tables created successfully")
