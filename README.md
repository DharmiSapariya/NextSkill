# NextSkill

**Evidence-based career intelligence for the tech job market — free, and built for individuals, not enterprises.**

[![CI](https://github.com/DharmiSapariya/NextSkill/actions/workflows/ci.yml/badge.svg)](https://github.com/DharmiSapariya/NextSkill/actions/workflows/ci.yml)
![Python](https://img.shields.io/badge/python-3.12-blue)
![FastAPI](https://img.shields.io/badge/backend-FastAPI-009688)
![PostgreSQL](https://img.shields.io/badge/database-PostgreSQL%2016-336791)
![Status](https://img.shields.io/badge/status-active%20development-orange)

> Every number in this README reflects real data currently sitting in a live database, or a feature actually exercised end to end against a live backend — not a mockup or a planned design. Anything still in progress is labeled as such rather than described like it's finished.

---

## The problem

Thousands of tech job postings go up every day, each one implicitly signaling what employers actually value right now. Nobody accessible to an individual turns that signal into a straight answer to the only question that matters: **what should I learn next, and is it worth it?**

The tools that *do* answer this well are locked behind enterprise sales:

| Tool | What it's good at | Where an individual loses |
|---|---|---|
| Lightcast / TalentNeuron | Deep labor-market modeling, role-transition data | Enterprise-only, sales-gated, unaffordable for a person |
| LinkedIn Talent Insights | Aggregate hiring trends | Built for recruiters, not job seekers |
| Jobscan / Teal | Resume-to-job-description matching | One listing at a time — gameable, no market signal |
| **NextSkill** | Skill-gap recommendations backed by real postings, free | — |

NextSkill sits in the gap: transparent about its methodology, grounded in aggregate real-market data, and free.

## What makes this different

Every recommendation traces back to real postings — click into any number and see the evidence, not a black-box score. That's the whole design philosophy, not just a tagline: the trend endpoint documents its own methodology in its response, the recommend endpoints attach real postings as evidence, and every "coming soon" feature below inherits the same rule before it ships.

## Architecture

```mermaid
flowchart LR
    A[Adzuna Job Search API] --> P[Pipeline Orchestrator]
    B[RemoteOK API] --> P
    P --> C[(PostgreSQL)]
    C --> D[Skill Extraction<br/>taxonomy regex + spaCy/skillNer]
    D --> C
    C --> E[FastAPI Backend]
    E -.->|fail-open caching| R[(Redis)]
    S[APScheduler<br/>cron ingestion + healthcheck] --> P
    E --> DASH[Streamlit Dashboard]
```

The pipeline orchestrator (`pipeline.py`) treats Adzuna as the required primary source — without `ADZUNA_APP_ID`/`ADZUNA_APP_KEY` configured, a run reports itself skipped up front rather than partially ingesting from RemoteOK alone and reporting a confusing partial result. The salary model only retrains when a run actually inserted new postings, not on every scheduled tick.

## What's live right now

**Backend / API**

- **Real user accounts** — signup/login (JWT, `python-jose` + bcrypt via `passlib`), a persistent saved skill profile per user (stored as JSONB), password change, account deletion — all rate-limited (5/min on auth-sensitive routes)
- **Skill-gap recommendation engine** — ranked by real posting demand, every recommendation backed by actual postings as evidence, not a score
- **Resume parsing + statistical match score** — upload a PDF/DOCX resume, auto-populate your skill profile, and get a match percentage computed against *hundreds* of real postings for your target role — not a single-JD keyword scan
- **Per-posting match score** — how well your profile matches one *specific* listing, not just a whole role's worth of postings
- **Salary prediction** — a model trained on real posting salary data, hot-reloaded from disk on mtime change (thread-safe, atomic swap — a partial/corrupt retrain artifact can't take down the live predictor), answering "what is learning Docker actually worth in dollars for this role"
- **Role-transition graph** and **skill co-occurrence graph** — graph-shaped endpoints (nodes + weighted edges) built from real skill overlap. The co-occurrence graph filters which pairs are worth drawing using the overlap coefficient (so ultra-common skills like Python don't drown out framework-level connections), but reports each edge's weight as Jaccard similarity
- **Three-tier role resolution** — exact match on a tracked role → curated alias dictionary (acronyms like SRE/QA/MLE/SWE, stack-based aliases like "React Developer" → frontend developer) → sentence-transformers semantic fallback (`all-MiniLM-L6-v2`, cosine similarity, 0.60 threshold) for anything else. Only the third tier reports a `similarity` score — the first two are literal lookups, not vector comparisons
- **Job search** — paginated, filterable by role, location, and Postgres-regex-computed seniority (senior/mid/junior aren't stored — they're inferred live from the title), plus bookmarking (saved jobs)
- **Skill demand trends** — month-over-month share of postings mentioning a skill, labeled rising / falling / flat / new, methodology included in the response
- **Skill and company directories** — searchable/paginated browse endpoints, plus a fixed top-hiring-companies leaderboard
- **Recommendation history & progress** — every past run is recorded; a progress endpoint diffs your first and latest run for a role into skills closed / still open / newly opened
- **Shareable public reports** — publish a past recommendation run as a login-free public link, revocable, never on by default
- **Digest** — on-demand computation of "what changed since your last run" across every role you've checked (email delivery not wired up — this environment has no SMTP credentials to send it with)
- **Tiered access** — free vs. pro gates evidence depth and history page size, not feature access itself
- **Admin endpoints** — platform-wide stats and user management (`/admin/*`) — API only; no admin UI yet
- **Redis-cached** graph/trend/related-skill endpoints — deliberately fail open: a cache outage degrades to "recompute every request," never to "the API is down." `cache_set()` returns whether the write actually happened (`False` on no client, a Redis error, *or* a non-JSON-serializable value) rather than raising
- **Two-source ingestion pipeline** — Adzuna (keyed, 21 tracked search terms, async with a concurrency cap and retry/backoff) and RemoteOK (keyless, Cloudflare-aware headers), orchestrated by `pipeline.py` with per-step failure isolation (one source or step failing doesn't abort the rest) and credential-aware skip behavior
- **Skill extraction, two ways** — a fast regex/taxonomy path (`skills_taxonomy.py`'s `SkillDefinition`/`SkillExtractor`, ~48 canonical skills with aliases, one pre-compiled master regex) that's what the orchestrated pipeline actually runs, and a heavier spaCy + skillNer NLP path (`extract_skillner.py`) that can discover skills outside the fixed taxonomy — run manually, not part of the default pipeline, since it needs the separate `requirements-nlp.txt` extras
- **Scheduled ingestion** — APScheduler, cron-configurable (`INGESTION_CRON`, default 3am daily), pipeline runs isolated in a subprocess so a memory-heavy run gets full OS-level RAM reclamation afterward, plus a 1-minute healthcheck heartbeat job for Docker/Kubernetes liveness probes, with graceful SIGTERM/SIGINT shutdown
- **CORS-enabled API**, **Dockerized** (API + scheduler + Postgres + Redis, all in one `docker-compose.yml`), **Alembic-migrated** schema (JSONB columns, explicit `ondelete` cascade behavior on every FK, unique indexes rather than bare unique constraints), CI running the full test suite against a seeded database on every push
- **Sentry error tracking** and structured logging throughout

**Dashboard** (Streamlit) — a working operator/power-user surface: login, recommend (+ evidence), match score, salary prediction, role-transition and skill co-occurrence graphs, trends, skill profile editing, history/progress, digest, shared-report management, and an admin stats page. Talks to the API over plain HTTP, nothing bypasses it.

**Frontend** — none right now. The previous React/Vite build was deliberately removed to make room for a ground-up redesign. A `fonts/` directory (Bricolage Grotesque + Farro, full weight sets, OFL-licensed) and a `design-assets/` directory (22 illustrations + 10 hand-drawn brand-color accent graphics, transparent PNGs) sit at the repo root, staged and ready for that rebuild — not wired into anything yet.

## API reference

**Open endpoints** (no auth required):

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness check — DB connectivity + Redis health |
| GET | `/jobs` | Paginated job search, filterable by role/location/seniority |
| GET | `/jobs/{job_id}` | Single posting detail |
| GET | `/companies` | Paginated/searchable company directory |
| GET | `/companies/top` | Top hiring companies by posting volume |
| GET | `/skills` | Paginated/searchable skill browse, grounded in real mention counts |
| GET | `/skills/{skill_name}/related` | Skill co-occurrence |
| GET | `/skills/co-occurrence-graph` | Graph-shaped skill co-occurrence data |
| GET | `/trends/{skill_name}` | Month-over-month demand for a skill |
| GET | `/roles/transition-graph` | Full graph (nodes + edges) of role-to-role skill similarity |
| GET | `/roles/{role}/nearest` | Nearest roles to a given role by skill overlap, with exact delta skills |
| GET | `/reports/{token}` | A published shared recommendation report |

**Auth:**

| Method | Path | Description |
|---|---|---|
| POST | `/auth/signup` | `{email, password}` → JWT access token (5/min) |
| POST | `/auth/login` | `{email, password}` → JWT access token (5/min) |
| POST | `/auth/refresh` | Exchange a valid token for a fresh one |
| GET | `/auth/me` | Current user + saved skill profile |
| PUT | `/auth/me/skills` | Update saved skill profile |
| PUT | `/auth/me/password` | Change password, requires current password (5/min) |
| DELETE | `/auth/me` | Delete account and everything tied to it, requires password |
| POST | `/auth/me/resume` | Upload a PDF/DOCX resume (max 5MB) — extracts and merges skills into your profile (10/min) |
| GET | `/auth/me/history` | Past `/recommend` / `/recommend/evidence` runs, tier-limited page size |
| GET | `/auth/me/history/progress` | First-run-vs-latest-run diff for a target role |
| GET | `/auth/me/digest` | What changed since your last run, across every role you've checked |
| POST | `/auth/me/history/{history_id}/share` | Publish a past run as a public link |
| GET | `/auth/me/shared-reports` | Your own published links |
| DELETE | `/auth/me/history/shared/{token}` | Revoke a published link |
| GET | `/auth/me/saved-jobs` | Your bookmarked postings |

**Protected** (require `Authorization: Bearer <token>`):

| Method | Path | Description |
|---|---|---|
| POST | `/recommend` | Skill-gap recommendations ranked by market demand. `skills` in the body is optional — omit it to use your saved profile (10/min) |
| POST | `/recommend/evidence` | Same, with real postings attached as evidence, tiered depth: free=3, pro=10 (10/min) |
| POST | `/match-score` | Statistical match % of your skills against real postings for a target role (10/min) |
| GET | `/jobs/{job_id}/match` | Match % against one specific posting's actual required skills |
| POST | `/predict-salary` | Predicted salary range for a target role + skill set, trained on real posting data (10/min) |
| POST | `/jobs/{job_id}/save` | Bookmark a posting (idempotent) |
| DELETE | `/jobs/{job_id}/save` | Remove a bookmark |

**Admin only:**

| Method | Path | Description |
|---|---|---|
| GET | `/admin/stats` | Platform-wide aggregate stats |
| GET | `/admin/users` | Searchable/paginated user list |
| PUT | `/admin/users/{user_id}` | Update a user (tier, admin flag) |
| DELETE | `/admin/users/{user_id}` | Remove a user |

## Project structure

```
NextSkill/
├── backend/            FastAPI app, ingestion pipeline, ORM models, Alembic migrations, tests, Dockerfile
├── dashboard/           Streamlit operator dashboard (talks to the API over HTTP only)
├── fonts/               Bricolage Grotesque + Farro font files, staged for the next frontend
├── design-assets/       Illustration + doodle-accent PNGs, staged for the next frontend
└── .github/workflows/   CI — pytest against a seeded Postgres + Redis + a dedicated empty test DB
```

## Tech stack

**Backend**
- **Language:** Python 3.12
- **Database:** PostgreSQL 16 (Docker Compose, host port 5433), schema managed via Alembic — JSONB columns, explicit cascade-delete FKs, unique indexes
- **ORM:** SQLAlchemy 2.x
- **Web framework:** FastAPI + Uvicorn, `slowapi` for per-route rate limiting, JWT auth (`python-jose` + `passlib`/bcrypt, pinned `bcrypt<4.0` for passlib 1.7.x compatibility)
- **Skill extraction:** a hand-maintained taxonomy (`skills_taxonomy.py`) with regex matching for the default pipeline, plus an optional spaCy (`en_core_web_lg`) + skillNer NLP path for open-ended discovery (`requirements-nlp.txt`, not installed by default)
- **Semantic matching:** sentence-transformers (`all-MiniLM-L6-v2`) as a fallback tier when exact/alias role matching misses
- **Data sources:** Adzuna Job Search API (keyed, primary) and RemoteOK (keyless, secondary)
- **Scheduling:** APScheduler, cron-driven, subprocess-isolated pipeline runs
- **Caching:** Redis, fail-open by design
- **Testing:** pytest, running in CI against a real seeded Postgres instance (plus a second, dedicated empty database for the skill-graph tests) — not mocked
- **Error tracking:** Sentry

**Dashboard**
- Streamlit, plotly + networkx for the graph visualizations

## Getting started

**Backend + API (Docker, recommended):**

```bash
git clone https://github.com/DharmiSapariya/NextSkill.git
cd NextSkill/backend
cp .env.example .env              # fill in JWT_SECRET_KEY at minimum; ADZUNA_APP_ID/KEY optional
docker compose up --build         # Postgres (5433) + Redis (6379) + API (8000) + scheduler
```

**Backend + API (manual):**

```bash
cd NextSkill/backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# Postgres + Redis need to be running and reachable at whatever DATABASE_URL/REDIS_URL point to
alembic upgrade head                    # creates/updates the schema

python3 seed_test_data.py               # fixture data to develop against, or:
python3 pipeline.py                     # the real thing — requires ADZUNA_APP_ID/APP_KEY

uvicorn api:app --reload --port 8000
```

Optional NLP extras (only needed for `extract_skillner.py`'s open-ended skill discovery):

```bash
pip install -r requirements-nlp.txt
python -m spacy download en_core_web_lg
```

**Running the test suite:**

```bash
pip install -r requirements-dev.txt
alembic upgrade head

# test_skill_graph.py needs a database containing nothing but what it
# seeds itself — create a second, empty database once:
createdb job_market_test
DATABASE_URL="postgresql+psycopg2://jobintel:localdevpassword@localhost:5432/job_market_test" \
  python3 -c "from models import Base, engine; Base.metadata.create_all(engine)"

python3 seed_test_data.py
python3 train_salary_model.py
pytest -v
```

**Dashboard:**

```bash
cd dashboard
pip install -r requirements.txt
streamlit run streamlit_app.py
```

## Known limitations

- **No frontend right now.** The previous React build was removed entirely to make room for a ground-up redesign — `fonts/` and `design-assets/` are staged for it, but nothing consumer-facing is live today beyond the API itself and the Streamlit dashboard.
- **Trend comparison** currently spans two 30-day windows restricted to a fixed set of tracked roles, to control for search coverage expanding over the project's timeline. This isn't a forecast — a real time-series model needs several more months of consistent data before it would add signal over this simpler comparison.
- **Role matching** in `/recommend` and `/trends` matches exact substrings and known aliases first; a sentence-transformers semantic fallback only kicks in when neither hits, so an unusual role phrasing can still resolve to the wrong tracked role. This fallback also needs one-time network access to download its model — in network-restricted environments it fails open to plain string matching (never crashes, just skips the semantic tier).
- **Digest is computation-only.** `/auth/me/digest` correctly identifies what changed since your last run, but there's no email delivery behind it — this environment has no SMTP credentials to send from. It's fully usable through the dashboard today; the "notification" part of the idea isn't built.
- **Admin has no frontend.** The admin endpoints (stats, user management) work and are covered by tests, but there's no dedicated UI for them yet beyond the dashboard's admin page.
- **The regex/taxonomy skill extractor and the spaCy/skillNer NLP extractor aren't unified.** The orchestrated pipeline (`pipeline.py`) only runs the fast, fixed-taxonomy extractor; the NLP path that can discover skills outside that list is a separate manual step, not scheduled.
- **Seed/dev data isn't production data.** `seed_test_data.py` exists purely so the test suite (and local development) has something to query against; it includes a handful of deliberately-named fixture rows (`pipeline-test-skill-*`) that show up if you browse the dev database directly. Real ingested data comes only from actually running the pipeline against Adzuna/RemoteOK.
- **The test suite needs two databases.** `test_skill_graph.py`'s exact-count assertions require a database containing nothing but what it seeds itself, which is incompatible with the rest of the suite depending on `seed_test_data.py`'s fixtures being present — see "Running the test suite" above for the one-time setup.

## Roadmap

Phases are ordered by leverage, not by calendar.

| Phase | Theme | What's in it |
|---|---|---|
| ✅ Shipped | Foundation | Auth, skill-gap recommender w/ evidence, trends, co-occurrence, CORS, Docker + CI |
| ✅ Shipped | The three differentiators | Resume parsing + statistical match score, salary prediction, role-transition graph |
| ✅ Shipped | Trust infrastructure | Alembic migrations, scheduled ingestion (APScheduler), Redis caching, structured logging + Sentry |
| ✅ Shipped | Smarter matching | Semantic role-name fallback matching, seniority segmentation, skill lifecycle labels |
| ✅ Shipped | Retention | Recommendation history + progress tracking, shareable public skill-report pages, on-demand digest (no email delivery yet) |
| ✅ Shipped | Backend redesign | Two-source ingestion (Adzuna + RemoteOK), structured skill taxonomy, hot-reloading salary model, JSONB + cascade-delete schema, dedicated test-database isolation |
| Next | Frontend rebuild | A new consumer-facing UI on top of the redesigned API, using the staged fonts/illustrations |
| Then | Live deployment | Hosting the API, frontend, and a production database somewhere other than local dev |
| Then | Admin UI | A real standalone frontend for the existing `/admin/*` endpoints |
| Then | Digest delivery | Actual email/notification delivery for the existing digest computation |

## Contributors

Built by [Dharmi Sapariya](https://github.com/DharmiSapariya) and [Bhavya Srimanduri](https://github.com/bhavyasrimanduri-bhavya).

This README is updated as the project progresses — see the commit history for the full record of development, including the debugging process.
