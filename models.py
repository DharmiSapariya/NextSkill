from sqlalchemy import create_engine, Column, Integer, String, Text, Date, ForeignKey, Numeric
from sqlalchemy.orm import declarative_base, relationship
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = "postgresql+psycopg2://jobintel:localdevpassword@localhost:5433/job_market"

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

if __name__ == "__main__":
    engine = create_engine(DATABASE_URL)
    Base.metadata.create_all(engine)
    print("Tables created successfully")
