# 🎯 NextSkill

**Evidence-based career intelligence for the tech job market** — free, and built for individuals, not enterprises.

<p align="center">
  <img alt="CI" src="https://github.com/DharmiSapariya/NextSkill/actions/workflows/ci.yml/badge.svg">
  <img alt="Python" src="https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white">
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white">
  <img alt="Redis" src="https://img.shields.io/badge/Redis-fail--open%20cache-DC382D?logo=redis&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/License-MIT-green">
</p>

<p align="center">
  <b>2 job sources · 30+ endpoints · 156 tests · Every number backed by real postings</b><br/>
  <sub>Built by <a href="https://github.com/DharmiSapariya">Dharmi Sapariya</a> & <a href="https://github.com/bhavyasrimanduri-bhavya">Bhavya Srimanduri</a></sub>
</p>

---

## 📖 Table of Contents

- [Why NextSkill?](#-why-nextskill)
- [Feature Tour](#-feature-tour)
- [Architecture](#️-architecture)
- [Tech Stack](#️-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [API Reference](#-api-reference)
- [Roadmap](#-roadmap)
- [Known Limitations](#-known-limitations)
- [Contributors](#-contributors)

---

## 🚀 Why NextSkill?

Thousands of tech job postings go up every day — each one a signal about what employers actually value. Nobody accessible to a regular person turns that signal into a straight answer to: **what should I learn next, and is it worth it?**

| Tool | Good at | Where you lose |
|---|---|---|
| Lightcast / TalentNeuron | Deep labor-market modeling | Enterprise-only, sales-gated |
| LinkedIn Talent Insights | Aggregate hiring trends | Built for recruiters, not you |
| Jobscan / Teal | Resume-to-JD matching | One listing at a time, gameable |
| **NextSkill** | Skill-gap recommendations, backed by real postings | **Free** |

> 💡 Every recommendation traces back to real postings — click into any number and see the evidence, not a black-box score.

## 🧩 Feature Tour

<table>
<tr>
<td width="33%" valign="top">

### 🧠 Intelligence
- Skill-gap recommendations, ranked by real market demand
- Resume upload → auto-parsed skill profile
- Statistical match score vs. real postings
- Salary prediction, hot-reloaded model
- Role-transition & skill co-occurrence graphs
- 3-tier role resolution (exact → alias → AI embedding)

</td>
<td width="33%" valign="top">

### 👤 Account & Retention
- JWT auth, saved skill profile
- Per-posting match score
- Recommendation history + progress diff
- Shareable public report links
- On-demand "what changed" digest
- Free / Pro tiers

</td>
<td width="33%" valign="top">

### ⚙️ Data & Infra
- 2-source ingestion: Adzuna + RemoteOK
- Scheduled pipeline (cron + healthcheck)
- Fail-open Redis caching
- Alembic-migrated Postgres schema
- Dockerized, CI-tested (156 tests)
- Sentry + structured logging

</td>
</tr>
</table>

### 🤖 How role matching actually works

```
"Data Scientist"  ──▶  exact match on tracked roles           ──▶  done, no AI needed
"React Developer" ──▶  curated alias dictionary                ──▶  done, no AI needed
"Growth Hacker"   ──▶  sentence-transformers semantic fallback  ──▶  cosine similarity ≥ 0.60
```

Only that third tier ever calls the embedding model — the first two are instant lookups.

## 🏗️ Architecture

```mermaid
flowchart LR
    subgraph Sources["🌐 Job Sources"]
        A[Adzuna API<br/>keyed, primary]
        B[RemoteOK API<br/>keyless, secondary]
    end

    subgraph Pipeline["⚙️ Ingestion Pipeline"]
        P[pipeline.py<br/>orchestrator]
        X[Skill Extraction<br/>taxonomy regex + spaCy/skillNer]
    end

    subgraph Store["🗄️ Data Layer"]
        DB[(PostgreSQL)]
        R[(Redis<br/>fail-open cache)]
    end

    subgraph Serve["🖥️ Serving"]
        API[FastAPI Backend]
        S[APScheduler<br/>cron + healthcheck]
        DASH[Streamlit Dashboard]
    end

    A & B --> P --> DB
    DB --> X --> DB
    API <-.-> R
    DB --> API --> DASH
    S --> P
```

**No Adzuna key configured?** The pipeline reports itself `skipped` immediately instead of partially ingesting from RemoteOK alone. **No new postings this run?** The salary model doesn't waste a retrain.

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **API** | FastAPI + Uvicorn, JWT auth (`python-jose` + `passlib`/bcrypt), `slowapi` rate limiting |
| **Database** | PostgreSQL 16, SQLAlchemy 2.x ORM, Alembic migrations — JSONB, cascade-delete FKs |
| **Caching** | Redis, fail-open by design |
| **Skill extraction** | Hand-built taxonomy + regex (`skills_taxonomy.py`), optional spaCy + skillNer NLP path |
| **Semantic matching** | sentence-transformers (`all-MiniLM-L6-v2`) |
| **Data sources** | Adzuna Job Search API, RemoteOK |
| **Scheduling** | APScheduler, subprocess-isolated cron runs |
| **Dashboard** | Streamlit + Plotly + NetworkX |
| **Testing** | pytest, real seeded Postgres in CI — nothing mocked |
| **Observability** | Sentry, structured logging |

## ⚡ Getting Started

### Docker (recommended)

```bash
git clone https://github.com/DharmiSapariya/NextSkill.git
cd NextSkill/backend
cp .env.example .env              # fill in JWT_SECRET_KEY; ADZUNA keys optional
docker compose up --build         # Postgres + Redis + API + scheduler, all wired up
```

| Service | URL |
|---|---|
| 🔌 API | http://localhost:8000 |
| 📚 Interactive docs | http://localhost:8000/docs |
| 🗄️ Postgres | localhost:5433 |
| 🔥 Redis | localhost:6379 |

### Manual

```bash
cd NextSkill/backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

alembic upgrade head                    # create/update the schema
python3 seed_test_data.py               # fixture data — or python3 pipeline.py for the real thing

uvicorn api:app --reload --port 8000
```

<details>
<summary>🧠 Optional NLP extras (open-ended skill discovery beyond the fixed taxonomy)</summary>

```bash
pip install -r requirements-nlp.txt
python -m spacy download en_core_web_lg
```
</details>

<details>
<summary>🧪 Running the test suite</summary>

```bash
pip install -r requirements-dev.txt
alembic upgrade head

# test_skill_graph.py needs a database with nothing in it but what it
# seeds itself — create a second, empty one once:
createdb job_market_test
DATABASE_URL="postgresql+psycopg2://jobintel:localdevpassword@localhost:5432/job_market_test" \
  python3 -c "from models import Base, engine; Base.metadata.create_all(engine)"

python3 seed_test_data.py
python3 train_salary_model.py
pytest -v
```
</details>

### Dashboard

```bash
cd dashboard
pip install -r requirements.txt
streamlit run streamlit_app.py
```

## 📁 Project Structure

```
NextSkill/
├── backend/            FastAPI app · ingestion pipeline · ORM · migrations · tests
├── dashboard/           Streamlit operator dashboard (talks to the API over HTTP)
├── fonts/               Bricolage Grotesque + Farro — staged for the next frontend
├── design-assets/       Illustrations + doodle accents — staged for the next frontend
└── .github/workflows/   CI — seeded Postgres + Redis + a dedicated empty test DB
```

## 🔌 API Reference

<details open>
<summary><b>Open endpoints</b> (no auth)</summary>

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness — DB + Redis health |
| GET | `/jobs` | Search, filter by role/location/seniority |
| GET | `/jobs/{id}` | Single posting |
| GET | `/companies`, `/companies/top` | Directory + leaderboard |
| GET | `/skills`, `/skills/{name}/related` | Skill browse + co-occurrence |
| GET | `/skills/{name}/resources` | Where to learn a skill (docs + course search links) |
| GET | `/skills/co-occurrence-graph` | Force-directed skill graph |
| GET | `/trends/{skill}` | Month-over-month demand |
| GET | `/roles/transition-graph`, `/roles/{role}/nearest` | Role-similarity graph |
| GET | `/reports/{token}` | A published shared report |

</details>

<details>
<summary><b>Auth-required endpoints</b> (29 routes — click to expand)</summary>

| Method | Path | Description |
|---|---|---|
| POST | `/auth/signup`, `/auth/login`, `/auth/refresh` | Account + JWT |
| GET/PUT | `/auth/me`, `/auth/me/skills` | Profile + saved skills |
| PUT | `/auth/me/password` | Change password |
| DELETE | `/auth/me` | Delete account |
| POST | `/auth/me/resume` | Upload résumé → extract skills |
| GET | `/auth/me/history`, `/auth/me/history/progress` | Past runs + progress diff |
| GET | `/auth/me/digest` | What changed since last run |
| POST/GET/DELETE | `/auth/me/history/{id}/share`, `/auth/me/shared-reports` | Public report sharing |
| GET | `/auth/me/saved-jobs` | Bookmarks |
| POST | `/recommend`, `/recommend/evidence` | Skill-gap recommendations |
| POST | `/match-score`, `GET /jobs/{id}/match` | Match % (role-wide / one posting) |
| POST | `/predict-salary` | Salary range prediction |
| POST/DELETE | `/jobs/{id}/save` | Bookmark toggle |
| POST/GET/PATCH/DELETE | `/applications`, `/applications/{id}`, `/applications/board` | Job application tracker (Kanban-style: saved/applied/interviewing/offer/rejected/withdrawn) |
| POST/GET/DELETE | `/auth/me/certifications`, `/auth/me/certifications/{id}` | Certifications on your profile |
| GET | `/career-plan` | Skill gap + learning resources + adjacent roles, in one call |

</details>

<details>
<summary><b>Admin-only endpoints</b></summary>

| Method | Path | Description |
|---|---|---|
| GET | `/admin/stats` | Platform-wide aggregate stats |
| GET | `/admin/users` | Searchable/paginated user list |
| PUT/DELETE | `/admin/users/{id}` | Update or remove a user |

</details>

## 🧭 Roadmap

- [x] Foundation — auth, skill-gap recommender w/ evidence, trends, co-occurrence, CI
- [x] The three differentiators — resume parsing, salary prediction, role-transition graph
- [x] Trust infra — Alembic, scheduled ingestion, Redis caching, Sentry
- [x] Smarter matching — semantic fallback, seniority segmentation, lifecycle labels
- [x] Retention — history/progress, shareable reports, digest
- [x] Backend redesign — two-source ingestion, structured taxonomy, hot-reload salary model, JSONB schema
- [ ] Frontend rebuild — a new UI on the staged fonts/illustrations
- [ ] Live deployment — hosted API, frontend, and production database
- [ ] Admin UI — a real frontend for `/admin/*`
- [ ] Digest delivery — actual email/notifications

## ⚠️ Known Limitations

<details>
<summary>Click to expand — nothing here is hidden, just tucked away for readability</summary>

- **No frontend right now.** Deliberately removed for a ground-up redesign — `fonts/` and `design-assets/` are staged for it.
- **Trend comparison** spans two 30-day windows on a fixed role set — not a forecast, just a simple comparison until there's months of consistent data.
- **Role matching** tries exact + alias first; the semantic fallback needs one-time network access to download its model, and fails open to plain string matching if that's unavailable.
- **Digest has no email delivery** — the computation is real and usable via the dashboard, but nothing sends it.
- **Admin has no dedicated frontend** — the endpoints work and are tested, just no standalone UI yet.
- **Two skill extractors, not unified** — the pipeline runs the fast taxonomy/regex path only; the spaCy/skillNer NLP path (which can discover skills outside the taxonomy) is a manual step.
- **Seed data isn't production data** — `seed_test_data.py` is for tests/local dev only; real data comes from actually running the pipeline.
- **Tests need two databases** — see the collapsible setup step above.

</details>

## 👥 Contributors

Built by:

- **Dharmi Sapariya** — [@DharmiSapariya](https://github.com/DharmiSapariya)
- **Bhavya Srimanduri** — [@bhavyasrimanduri-bhavya](https://github.com/bhavyasrimanduri-bhavya)

---

<p align="center">⭐ If NextSkill is useful to you, consider starring the repo!</p>
