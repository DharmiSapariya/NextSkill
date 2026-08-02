# NextSkill

**Data-driven skill intelligence for the tech job market.**

> **Status: Work in progress.** This project is being built incrementally and in public. Every figure in this README reflects real data currently stored in a live database — nothing here is simulated or projected.

---

## Overview

Thousands of technical job postings are published every day, each implicitly signaling which skills employers value. No accessible tool aggregates this signal over time or connects it to an individual's own skill set. Job seekers are left making learning decisions based on anecdote rather than evidence.

**NextSkill** addresses this by collecting real job postings, extracting the skills they mention using NLP, and — as the project matures — surfacing which skills are in demand, how that demand is trending, and what an individual should learn next to close the gap.

## Why This Project Exists

Most existing tools fall into one of two categories:

- **Enterprise labor-market platforms** (Lightcast, TalentNeuron, LinkedIn Talent Insights) — genuinely powerful, but sold through enterprise sales processes and inaccessible to individuals or students.
- **Single-comparison resume tools** (Jobscan, Teal, and similar) — compare a resume against one job description at a time, with no concept of aggregate market trends or demand direction.

NextSkill is built to occupy the space between these two: free, transparent about its methodology, and grounded in aggregate market data rather than a single job listing.

## Architecture

```
Job Board APIs -> Ingestion -> PostgreSQL -> NLP Skill Extraction -> Trend Analysis -> API -> Dashboard
```

1. **Ingest** - pull real postings from job-board APIs
2. **Store** - normalize and persist into PostgreSQL with idempotent, duplicate-safe loading
3. **Extract** - identify skills mentioned in each posting using NLP (spaCy + a 60,000+ skill taxonomy)
4. **Analyze** - track how skill demand shifts over time *(in progress)*
5. **Recommend** - rank skill gaps by market demand and trend direction *(planned)*
6. **Serve** - expose results via a documented API and an interactive dashboard *(planned)*

## Current Status

| Component | Status |
|---|---|
| Data source research & selection | Complete |
| Job posting ingestion (Adzuna API, 21 tech roles) | Complete |
| PostgreSQL schema (`companies`, `jobs`, `skills`, `job_skills`) | Complete |
| Idempotent, duplicate-safe data loading | Complete |
| NLP skill extraction (spaCy + skillNer, 60k+ skill taxonomy) | Complete |
| Noise filtering / skill blocklist | In progress |
| Trend analysis & forecasting | Planned |
| Skill-gap recommendation engine | Planned |
| FastAPI backend | Planned |
| Interactive dashboard | Planned |
| Deployment | Planned |

**Current dataset:** 3,086 real postings collected across 21 distinct technical roles; ~5,900+ clean skill mentions extracted after noise filtering.

## Tech Stack

- **Language:** Python 3.12
- **Database:** PostgreSQL 16 (containerized via Docker Compose)
- **ORM:** SQLAlchemy 2.x
- **NLP:** spaCy (`en_core_web_lg`) + skillNer, built on the EMSI/Lightcast open skills database
- **Data source:** Adzuna Job Search API
- **Planned:** FastAPI, Streamlit or React

## Getting Started

```bash
git clone https://github.com/DharmiSapariya/NextSkill.git
cd NextSkill

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt   # coming soon

docker compose up -d
python3 models.py                     # creates the database schema
python3 fetch_adzuna.py               # pulls postings from Adzuna
python3 load_data.py                  # loads postings into PostgreSQL
NLTK_DISABLE_IMPORT_SECURITY=1 python3 extract_skillner.py   # extracts skills via NLP
```

A `.env.example` and `requirements.txt` will be added as the setup stabilizes.

## Roadmap

The next milestone is building the trend-analysis layer: aggregating skill mentions over time to determine which skills are gaining or losing demand, followed by the skill-gap recommendation engine that ties this data to an individual user's skill set.

## Contributors

Built by **[Dharmi Sapariya](https://github.com/DharmiSapariya)** and **Bhavya**.

---

*This README is updated as the project progresses - see the commit history for a full record of development, including the debugging process.*
