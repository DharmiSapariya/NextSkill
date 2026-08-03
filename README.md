# NextSkill

Data-driven skill intelligence for the tech job market.

**Status:** Work in progress, built incrementally and in public. Every figure in this README reflects real data currently stored in a live database — nothing here is simulated or projected.

## Overview

Thousands of technical job postings are published every day, each implicitly signaling which skills employers value. No accessible tool aggregates this signal over time or connects it to an individual's own skill set. Job seekers are left making learning decisions based on anecdote rather than evidence.

NextSkill addresses this by collecting real job postings, extracting the skills they mention using NLP, and surfacing which skills are in demand, how that demand is trending, and what an individual should learn next to close the gap — backed by real posting evidence, not a black-box score.

## Why This Project Exists

Most existing tools fall into one of two categories:

- **Enterprise labor-market platforms** (Lightcast, TalentNeuron, LinkedIn Talent Insights) — genuinely powerful, but sold through enterprise sales processes and inaccessible to individuals or students.
- **Single-comparison resume tools** (Jobscan, Teal, and similar) — compare a resume against one job description at a time, with no concept of aggregate market trends or demand direction.

NextSkill occupies the space between these two: free, transparent about its methodology, and grounded in aggregate market data rather than a single job listing.

## Architecture

```
Adzuna API -> Ingestion -> PostgreSQL -> NLP Skill Extraction -> FastAPI -> Streamlit Dashboard
```

- **Ingest** — pull real postings from the Adzuna Job Search API across 21 tech roles
- **Store** — normalize and persist into PostgreSQL with idempotent, duplicate-safe loading
- **Extract** — identify skills mentioned in each posting using NLP (spaCy + skillNer, built on a 60,000+ skill taxonomy, supplemented with regex for common single-word skills the NLP misses)
- **Analyze** — track how skill demand shifts month over month, restricted to a fixed core-role comparison set to control for search-coverage changes over the project's timeline
- **Recommend** — rank skill gaps by market demand, with real posting evidence attached to every recommendation
- **Serve** — a documented, authenticated, rate-limited FastAPI backend plus an interactive Streamlit dashboard

## Current Status

| Component | Status |
|---|---|
| Data source research & selection | Complete |
| Job posting ingestion (Adzuna API, 21 tech roles) | Complete |
| PostgreSQL schema (companies, jobs, skills, job_skills) | Complete |
| Idempotent, duplicate-safe data loading | Complete |
| NLP skill extraction (spaCy + skillNer, 60k+ skill taxonomy) | Complete |
| Noise filtering / skill blocklist / duplicate merging | Complete |
| Trend analysis (month-over-month, core-role-controlled) | Complete |
| Skill-gap recommendation engine (with posting evidence) | Complete |
| Skill co-occurrence ("what else pairs with X") | Complete |
| FastAPI backend (8 endpoints, API-key auth, rate limiting) | Complete |
| Interactive dashboard (Streamlit) | MVP built |
| Forecasting model (Prophet/ARIMA) | Deferred — needs more months of data |
| Dockerfile for the API + full docker-compose (API + DB) | Planned |
| CI (GitHub Actions running pytest on push) | Planned |
| Deployment | Planned |

**Current dataset:** 3,086 real postings collected across 21 distinct technical roles; ~6,900+ skill mentions extracted, noise-filtered and duplicate-merged.

## API

Base endpoints (no auth required):
- `GET /health`
- `GET /jobs` — paginated, filterable by role/location
- `GET /jobs/{job_id}`
- `GET /companies/top`
- `GET /trends/{skill_name}` — month-over-month demand, restricted to a fixed core-role set to keep the comparison meaningful (methodology explained in the response itself)
- `GET /skills/{skill_name}/related` — skill co-occurrence within postings

Protected endpoints (require an `X-API-Key` header, rate-limited to 10 requests/minute):
- `POST /recommend` — skill-gap recommendations ranked by market demand
- `POST /recommend/evidence` — same, with real postings attached as evidence for every recommendation

## Tech Stack

- **Language:** Python 3.12
- **Database:** PostgreSQL 16 (containerized via Docker Compose, host port 5433)
- **ORM:** SQLAlchemy 2.x
- **NLP:** spaCy (`en_core_web_lg`) + skillNer, built on the EMSI/Lightcast open skills database
- **Data source:** Adzuna Job Search API
- **Backend:** FastAPI + Uvicorn, `slowapi` for rate limiting, custom `X-API-Key` auth
- **Testing:** pytest (13 tests covering endpoints, auth, and recommendation logic)
- **Dashboard:** Streamlit

## Getting Started

```bash
git clone https://github.com/DharmiSapariya/NextSkill.git
cd NextSkill
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt   # coming soon
docker compose up -d              # starts Postgres on port 5433

python3 models.py                                              # creates the database schema
python3 fetch_adzuna.py                                         # pulls postings from Adzuna
python3 load_data.py                                            # loads postings into PostgreSQL
NLTK_DISABLE_IMPORT_SECURITY=1 python3 extract_skillner.py       # extracts skills via NLP
python3 extract_languages.py                                     # supplementary extraction for common single-word skills

uvicorn api:app --reload --port 8000     # in one terminal — starts the API
streamlit run streamlit_app.py           # in another terminal — starts the dashboard
```

A `.env` file is required with `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, and `NEXTSKILL_API_KEY` — see `.env.example` (coming soon).

## Known Limitations

- **Trend comparison** currently spans two months (June–July 2026) restricted to a fixed set of 8 core roles, to control for the fact that search coverage expanded from a smaller initial role set to 21 roles over the project's timeline. This isn't a forecast — a real time-series model needs several more months of consistent data before it would add signal over this simpler comparison.
- **Role matching** in `/recommend` and `/trends` uses exact substring matching against job titles, so a target role phrase must closely match how roles appear in the underlying postings (e.g. "machine learning engineer" works; unusual phrasings may return no results). Semantic/embedding-based matching is a planned improvement.

## Roadmap

1. Add a Dockerfile for the API itself and a combined `docker-compose.yml` (API + DB)
2. Set up GitHub Actions CI to run pytest on every push
3. Semantic/embedding-based skill and role matching (e.g. recognizing "Postgres"/"PostgreSQL" as the same skill, and fuzzy role-name matching)
4. Deploy (Render/Railway/Fly.io for the API, Supabase/Neon for Postgres)
5. Formal EDA notebook with saved visualizations
6. "Top skills for X role in 2026" write-up using real findings from this data

## Contributors

Built by [Dharmi Sapariya](https://github.com/DharmiSapariya) and [Bhavya Srimanduri](https://github.com/bhavyasrimanduri-bhavya).

This README is updated as the project progresses — see the commit history for a full record of development, including the debugging process.
