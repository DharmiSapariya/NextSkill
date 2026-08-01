# 🎯 NextSkill

**Stop guessing what to learn next. Let the job market tell you.**

> 🚧 **Work in progress** — this project is being built in public, one real piece at a time. Nothing here is faked or mocked — every number below is from real data sitting in a real database right now. Star/watch the repo to follow along as it grows.

---

## 🤔 The Problem

Somewhere out there, thousands of companies are posting job listings *right now*, each one quietly telling you exactly what skills they want. Nobody reads all of them. Nobody tracks how those wants shift over time. So job seekers are left guessing — Python or Go? Docker or Kubernetes? — based on vibes, not evidence.

**NextSkill reads the job market so you don't have to.**

## 💡 What Makes This Different

Most "skill match" tools compare your resume to **one** job description and hand you a score. That's it. NextSkill does something genuinely different:

- 📈 **Tracks demand *over time*** — not just "is this skill wanted," but "is it trending up or fading out"
- 🔍 **Radically transparent** — every recommendation comes with the real posting count behind it, not a black-box score
- 🆓 **Free and instant** — no signup, no sales call, no enterprise seat license (looking at you, Lightcast)
- 🎯 **Market-aware, not JD-aware** — compares your skills against the *aggregate* demand curve for a whole role, not a single listing

Enterprise tools like Lightcast and LinkedIn Talent Insights have this kind of trend data — but they're built for HR departments with budgets, not for a student figuring out what to learn next. NextSkill lives in the gap nobody's filling.

## 🏗️ How It Works (the vision)

```
Job Boards/APIs  →  Ingestion  →  PostgreSQL  →  NLP Skill Extraction  →  Trend Engine  →  API  →  Dashboard
```

1. **Ingest** real job postings from job-board APIs
2. **Store** them in a clean, normalized PostgreSQL schema
3. **Extract** the skills mentioned in every posting using NLP
4. **Track** how skill demand rises and falls over time
5. **Recommend** what to learn next, ranked by real market demand + trend direction
6. **Serve it all** through a documented API and an interactive dashboard

## ✅ Current Status

Here's exactly what's real right now — updated as it's built, not written in advance:

| Piece | Status |
|---|---|
| 🔌 Data source research & selection | ✅ Done |
| 📥 Job posting ingestion (Adzuna API) | ✅ Done |
| 🐘 PostgreSQL schema (`companies`, `jobs`) | ✅ Done |
| ♻️ Idempotent, dedup-safe data loading | ✅ Done |
| 🧹 Deeper data cleaning | ⏳ In progress |
| 🧠 NLP skill extraction | ⏳ Up next |
| 📊 Trend analysis & forecasting | 🔜 Planned |
| 🎯 Skill-gap recommendation engine | 🔜 Planned |
| ⚡ FastAPI backend | 🔜 Planned |
| 📈 Interactive dashboard | 🔜 Planned |
| 🚀 Deployment | 🔜 Planned |

**Real numbers so far:** 50 real job postings collected, cleaned, and sitting in a live, queryable database — with zero duplicates on reload, thanks to idempotent loading.

## 🛠️ Tech Stack

- **Language:** Python 3.12
- **Database:** PostgreSQL 16 (via Docker Compose)
- **ORM:** SQLAlchemy 2.x
- **Data source:** Adzuna Job Search API
- **Coming soon:** spaCy (NLP), FastAPI, Streamlit/React

## 🚀 Getting Started (so far)

```bash
git clone https://github.com/DharmiSapariya/NextSkill.git
cd NextSkill

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt   # coming soon

docker compose up -d
python3 models.py       # creates the schema
python3 fetch_adzuna.py # pulls fresh postings
python3 load_data.py    # loads them into Postgres
```

*(A `.env.example` and `requirements.txt` are coming as the setup stabilizes.)*

## 🗺️ What's Next

The next milestone is teaching the system to actually *read* job descriptions — building a skills taxonomy and an NLP pipeline (spaCy) that extracts which real skills each posting is asking for. That's the piece that turns "a pile of job listings" into "an actual answer" — so it's the whole point of the project, and it's coming next.

## 👋 Why This Exists

This is a portfolio project built to demonstrate both backend/data engineering (pipelines, databases, APIs) and applied data science (NLP, trend analysis, recommendation systems) — built in public, with every step, dead end, and bug fix left visible in the commit history instead of squashed away.

Follow along — this README updates as the project grows.

---

*Built by [Dharmi Sapariya](https://github.com/DharmiSapariya)*
