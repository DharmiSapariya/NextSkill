# Roadmap

Where NextSkill is headed, ordered by leverage — not by calendar. Each phase builds on the one before it.

## ✅ Phase 0 — Foundation (shipped)

- Real user accounts (JWT auth, saved skill profiles)
- Skill-gap recommendation engine, every recommendation backed by real postings as evidence
- Job search, skill demand trends, skill co-occurrence, top hiring companies
- CORS-enabled API, Dockerized (API + Postgres), CI running the full suite against a seeded database

## ✅ Phase 1 — The three differentiators (shipped)

The features that don't exist anywhere else in this space for individuals:

- **Resume parsing + statistical match score** — upload a resume, get a match % computed against hundreds of real postings for a target role, not a single-JD keyword scan
- **Salary prediction** — a model trained on real posting salary data, answering what a skill is actually worth in dollars for a given role
- **Role-transition graph** — which roles are realistically one skill-gap away versus three, built from real skill co-occurrence

## 🔨 Phase 2 — Trust infrastructure

The unglamorous work that everything after this depends on:

- **Alembic migrations** — replace manual `Base.metadata.create_all` with real schema versioning before there's live user data to break
- **Scheduled ingestion** — cron/Celery beat instead of manually re-running `fetch_adzuna.py`, so the dataset actually stays current
- **Redis caching** — the transition graph and trend endpoints recompute from scratch per request; cache them once traffic is real
- **Structured logging + error tracking** — Sentry is wired in; extend it with structured logs for anything Sentry doesn't catch
- **Live deployment** — API + Postgres actually reachable on the internet (Render/Railway/Fly + Neon/Supabase), `DATABASE_URL` is already externalized for exactly this

## Phase 3 — Smarter matching

- **Semantic skill/role matching** — sentence-transformer embeddings instead of substring matching, so "ML Engineer" and "Machine Learning Engineer" resolve to the same thing
- **Skill lifecycle labels** — emerging / growing / mature / declining, not just this month's up-or-down
- **Seniority segmentation** — junior and senior expectations for the same title differ wildly and are currently mashed together
- **Auto-retraining for the salary model** — currently a manual script run; tie it to the scheduled ingestion pipeline from Phase 2

## Phase 4 — Retention

- **Recommendation history** — track a user's skill gap over time instead of a single point-in-time snapshot
- **Shareable public skill-report pages** — a link, not a login-gated result
- **Weekly digest notifications** — "your target role's top gap skill just changed," the retention loop every one-shot tool in this space is missing

## Phase 5 — Product

- **Tiered access** — free vs. deeper evidence/history, a monetization story even before there's a reason to charge anyone
- **Percentile match scoring** — "you match X% of real postings for this role," more visceral than a bare skill list, still fully evidence-backed
- **Admin/analytics dashboard** — aggregate insights that double as marketing material ("state of the job market")
- **Graph-shaped API endpoints for a visualization-heavy frontend** — the transition graph already returns nodes/edges; extend that pattern to co-occurrence and trend data too

---

Have an idea that isn't here? Open an issue — this file is meant to be argued with, not treated as fixed.

