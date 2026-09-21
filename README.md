# 🎯 NextSkill

**Evidence-based career intelligence for the tech job market** — free, and built for individuals, not enterprises.

[![CI](https://github.com/DharmiSapariya/NextSkill/actions/workflows/ci.yml/badge.svg)](https://github.com/DharmiSapariya/NextSkill/actions/workflows/ci.yml)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-fail--open%20cache-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

**2 job sources · 30+ endpoints · 156 tests · Every number backed by real postings**
Built solo by [Dharmi Sapariya](https://github.com/DharmiSapariya)

---

## 🚀 Why this exists

Thousands of tech job postings go up every day — each one a signal about what employers actually value. Nobody accessible to a regular person turns that signal into a straight answer to: **what should I learn next, and is it worth it?**

| Tool                     | Good at                                            | Where you lose                  |
| ------------------------ | --------------------------------------------------- | -------------------------------- |
| Lightcast / TalentNeuron | Deep labor-market modeling                          | Enterprise-only, sales-gated     |
| LinkedIn Talent Insights | Aggregate hiring trends                             | Built for recruiters, not you    |
| Jobscan / Teal           | Resume-to-JD matching                               | One listing at a time, gameable  |
| **NextSkill**            | Skill-gap recommendations, backed by real postings  | **Free**                         |

> 💡 Every recommendation traces back to real postings — click into any number and see the evidence, not a black-box score.

---

## 📸 See it

<!--
  Drop your own screenshots into `design-assets/screenshots/` — GitHub
  renders them inline the moment the files exist at these paths.
  Suggested shots: dashboard overview, skill-gap recommendation + evidence
  drawer, salary prediction card, role-transition graph, application tracker.
-->

<table>
  <tr>
    <td width="50%"><img src="design-assets/screenshots/dashboard-overview.png" alt="Dashboard overview" /><p align="center"><sub>Streamlit operator dashboard</sub></p></td>
    <td width="50%"><img src="design-assets/screenshots/skill-gap-evidence.png" alt="Skill-gap recommendation with evidence" /><p align="center"><sub>Skill-gap recommendation, click-through evidence</sub></p></td>
  </tr>
  <tr>
    <td width="50%"><img src="design-assets/screenshots/salary-prediction.png" alt="Salary prediction" /><p align="center"><sub>Salary range prediction</sub></p></td>
    <td width="50%"><img src="design-assets/screenshots/role-graph.png" alt="Role transition graph" /><p align="center"><sub>Role-transition & skill co-occurrence graph</sub></p></td>
  </tr>
</table>

> Run the dashboard locally, grab a few screenshots, drop them in `design-assets/screenshots/` with the filenames above — this section lights up automatically, no markdown changes needed.

---

## 🗺️ The system, end to end

Everything starts with two job boards and ends with a dashboard someone can actually act on. This is the whole shape of it before we zoom into any one piece:

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

Two design calls worth knowing about, because they shape a lot of the rest:

- **No Adzuna key configured?** The pipeline reports itself `skipped` immediately instead of quietly ingesting from RemoteOK alone and pretending that's the full picture.
- **No new postings this run?** The salary model doesn't waste a retrain on data it's already seen.

---

## 🔄 Flow 1 — From cron trigger to a row in Postgres

This is what actually happens every time the scheduler fires.

```mermaid
flowchart TD
    Start(["Scheduled cron trigger"]) --> CheckKey{"Adzuna key configured?"}
    CheckKey -- No --> SkipAdzuna["Skip Adzuna, log 'skipped'"]
    CheckKey -- Yes --> FetchAdzuna["Fetch Adzuna postings"]
    Start --> FetchRemoteOK["Fetch RemoteOK postings"]
    FetchAdzuna --> Dedup["Deduplicate & normalize"]
    FetchRemoteOK --> Dedup
    SkipAdzuna --> Dedup
    Dedup --> Extract["Extract skills:<br/>taxonomy/regex path<br/>(+ optional spaCy/skillNer)"]
    Extract --> Store[("Write to PostgreSQL")]
    Store --> NewCheck{"New postings this run?"}
    NewCheck -- Yes --> Retrain["Retrain salary model,<br/>hot-reload into API"]
    NewCheck -- No --> SkipRetrain["Skip retrain"]
    Retrain --> Health["Update healthcheck status"]
    SkipRetrain --> Health
```

It runs isolated in its own subprocess via APScheduler, so a bad ingestion run can't take the live API down with it — worst case, the healthcheck flips and the next scheduled run gets another shot.

---

## 🔄 Flow 2 — Resolving "React Developer" to an actual tracked role

Before any recommendation logic runs, a free-text role has to become one of the roles the system actually tracks. Three tiers, cheapest first:

```mermaid
flowchart LR
    In["Incoming role string<br/>e.g. 'Growth Hacker'"] --> T1{"Exact match on<br/>tracked roles?"}
    T1 -- Yes --> Done1["✅ Resolved — instant"]
    T1 -- No --> T2{"Match in curated<br/>alias dictionary?"}
    T2 -- Yes --> Done2["✅ Resolved — instant"]
    T2 -- No --> T3["sentence-transformers<br/>semantic embedding"]
    T3 --> Sim{"Cosine similarity<br/>≥ 0.60?"}
    Sim -- Yes --> Done3["✅ Resolved — closest match"]
    Sim -- No --> Fail["⚠️ Falls back to<br/>plain string matching"]
```

The embedding model only gets called on that third tier — most requests never touch it, which keeps the common case fast and the uncommon case still functional even if the model can't be downloaded (no network access, for instance).

---

## 🔄 Flow 3 — What happens on `POST /recommend`

The actual request a user's browser (or the dashboard) fires when they ask "what am I missing for this role?"

```mermaid
sequenceDiagram
    participant U as User
    participant API as FastAPI
    participant Auth as JWT Auth
    participant Cache as Redis
    participant DB as PostgreSQL
    participant ML as Semantic Matcher

    U->>API: POST /recommend (target role + known skills)
    API->>Auth: validate JWT
    Auth-->>API: OK
    API->>ML: resolve role (Flow 2, above)
    ML-->>API: matched role
    API->>Cache: check cached postings for role
    alt cache hit
        Cache-->>API: cached postings
    else cache miss (or Redis down)
        API->>DB: query matching postings
        DB-->>API: postings
        API->>Cache: store (fail-open — never blocks the request)
    end
    API->>API: diff known skills vs. market-demanded skills
    API-->>U: ranked skill gaps + evidence links back to postings
```

The "fail-open" part matters: if Redis is down, the request still succeeds — it just skips the cache and hits Postgres directly. A cache outage degrades latency, not correctness.

`/recommend/evidence` replays the identical query but returns the actual postings behind a given number, instead of just the score — that's the "click into any number and see the evidence" promise from the top of this README.

---

## 🔄 Flow 4 — Salary prediction and the hot-reload trick

```mermaid
flowchart LR
    A["POST /predict-salary<br/>(role, skills, seniority, location)"] --> B["Load currently-active model"]
    B --> C{"Has ingestion<br/>added new postings<br/>since last load?"}
    C -- Yes --> D["Reload latest trained model<br/>from Flow 1's retrain step"]
    C -- No --> E["Use already-loaded model"]
    D --> F["Predict"]
    E --> F
    F --> G["Return range + confidence"]
```

The model retrains inside the ingestion pipeline (Flow 1), and the API picks up the new version without a restart — "hot-reloaded" just means the API checks freshness on each request instead of only at boot.

---

## 🔄 Flow 5 — Why trend comparison is deliberately narrow

```mermaid
flowchart LR
    A["GET /trends/{skill}"] --> B["Restrict to fixed<br/>8-role whitelist"]
    B --> C["Compare two<br/>30-day windows"]
    C --> D["Return % change in demand"]
```

Early on, trend comparisons ran against *all* tracked roles — and as search coverage expanded from 6 roles to 21, "demand" for a skill appeared to spike even when nothing in the actual market had changed. Restricting the comparison to a fixed role set removes that confound. It's honestly labeled as a comparison, not a forecast — real time-series forecasting (Prophet/ARIMA) is parked until there's enough months of consistent data for it to mean something.

---

## 🧭 How this got built

Each phase closed a specific gap before the next one started:

```mermaid
flowchart TD
    P1["1. Foundation<br/>auth · skill-gap recommender w/ evidence · trends · co-occurrence · CI"]
    P2["2. Trust infra<br/>Alembic · scheduled ingestion + healthchecks · fail-open Redis · Sentry"]
    P3["3. The differentiators<br/>resume parsing · salary prediction · role-transition graph"]
    P4["4. Smarter matching<br/>semantic fallback · seniority segmentation · lifecycle labels"]
    P5["5. Retention<br/>history/progress diff · shareable reports · digest"]
    P6["6. Backend redesign<br/>two-source ingestion · structured taxonomy · hot-reload model · JSONB · whitelist trend fix"]
    P7["7. Next up<br/>frontend rebuild · live deployment · admin UI · digest email"]

    P1 --> P2 --> P3 --> P4 --> P5 --> P6 --> P7
```

A couple of specific things happened along the way that shaped later decisions: adding JWT auth briefly broke three existing tests because they weren't sending credentials — fixed, and a dedicated test now asserts an unauthenticated `/recommend` returns `401`, so that regression can't quietly come back. Rate limiting (10 req/min via `slowapi`) went on the compute-heavy endpoints once it became clear the semantic matching and recommendation paths were the ones worth protecting.

---

## 🧩 Everything it does, grouped by what it's for

<details open>
<summary><strong>🧠 Intelligence</strong></summary>

- Skill-gap recommendations, ranked by real market demand
- Resume upload → auto-parsed skill profile
- Statistical match score vs. real postings
- Salary prediction, hot-reloaded model
- Role-transition & skill co-occurrence graphs
- 3-tier role resolution (exact → alias → AI embedding)

</details>

<details>
<summary><strong>👤 Account & Retention</strong></summary>

- JWT auth, saved skill profile
- Per-posting match score
- Recommendation history + progress diff
- Shareable public report links
- On-demand "what changed" digest
- Free / Pro tiers

</details>

<details>
<summary><strong>⚙️ Data & Infra</strong></summary>

- 2-source ingestion: Adzuna + RemoteOK
- Scheduled pipeline (cron + healthcheck)
- Fail-open Redis caching
- Alembic-migrated Postgres schema
- Dockerized, CI-tested (156 tests)
- Sentry + structured logging

</details>

---

## 🛠️ Built with

| Layer                 | Technology                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| **API**                 | FastAPI + Uvicorn, JWT auth (`python-jose` + `passlib`/bcrypt), `slowapi` rate limiting     |
| **Database**             | PostgreSQL 16, SQLAlchemy 2.x ORM, Alembic migrations — JSONB, cascade-delete FKs           |
| **Caching**              | Redis, fail-open by design                                                                  |
| **Skill extraction**     | Hand-built taxonomy + regex (`skills_taxonomy.py`), optional spaCy + skillNer NLP path       |
| **Semantic matching**    | sentence-transformers (`all-MiniLM-L6-v2`)                                                  |
| **Data sources**         | Adzuna Job Search API, RemoteOK                                                             |
| **Scheduling**           | APScheduler, subprocess-isolated cron runs                                                  |
| **Dashboard**            | Streamlit + Plotly + NetworkX                                                               |
| **Testing**              | pytest, real seeded Postgres in CI — nothing mocked                                          |
| **Observability**        | Sentry, structured logging                                                                  |

---

## ⚡ Run it

<details open>
<summary><strong>Docker (recommended)</strong></summary>

```bash
git clone https://github.com/DharmiSapariya/NextSkill.git
cd NextSkill/backend
cp .env.example .env              # fill in JWT_SECRET_KEY; ADZUNA keys optional
docker compose up --build         # Postgres + Redis + API + scheduler, all wired up
```

| Service            | URL                          |
| -------------------- | ----------------------------- |
| 🔌 API              | <http://localhost:8000>       |
| 📚 Interactive docs | <http://localhost:8000/docs>  |
| 🗄️ Postgres         | localhost:5433                |
| 🔥 Redis             | localhost:6379                |

</details>

<details>
<summary><strong>Manual (no Docker)</strong></summary>

```bash
cd NextSkill/backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

alembic upgrade head                    # create/update the schema
python3 seed_test_data.py               # fixture data — or python3 pipeline.py for the real thing

uvicorn api:app --reload --port 8000
```

**Optional NLP extras** (open-ended skill discovery beyond the fixed taxonomy):

```bash
pip install -r requirements-nlp.txt
python -m spacy download en_core_web_lg
```

</details>

<details>
<summary><strong>Running the test suite</strong></summary>

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

<details>
<summary><strong>Dashboard</strong></summary>

```bash
cd dashboard
pip install -r requirements.txt
streamlit run streamlit_app.py
```

</details>

---

## 📁 Where things live

```
NextSkill/
├── backend/            FastAPI app · ingestion pipeline · ORM · migrations · tests
├── dashboard/           Streamlit operator dashboard (talks to the API over HTTP)
├── fonts/               Bricolage Grotesque + Farro — staged for the next frontend
├── design-assets/       Illustrations + doodle accents — staged for the next frontend
└── .github/workflows/   CI — seeded Postgres + Redis + a dedicated empty test DB
```

---

## 🔌 Every endpoint

<details>
<summary><strong>Open endpoints (no auth)</strong></summary>

| Method | Path                                                 | Description                                           |
| ------ | ----------------------------------------------------- | ------------------------------------------------------ |
| GET    | `/health`                                            | Liveness — DB + Redis health                           |
| GET    | `/jobs`                                              | Search, filter by role/location/seniority              |
| GET    | `/jobs/{id}`                                         | Single posting                                         |
| GET    | `/companies`, `/companies/top`                       | Directory + leaderboard                                 |
| GET    | `/skills`, `/skills/{name}/related`                  | Skill browse + co-occurrence                            |
| GET    | `/skills/{name}/resources`                           | Where to learn a skill (docs + course search links)     |
| GET    | `/skills/co-occurrence-graph`                        | Force-directed skill graph                               |
| GET    | `/trends/{skill}`                                    | Month-over-month demand                                  |
| GET    | `/roles/transition-graph`, `/roles/{role}/nearest`   | Role-similarity graph                                    |
| GET    | `/reports/{token}`                                   | A published shared report                                |

</details>

<details>
<summary><strong>Auth-required endpoints (29 routes)</strong></summary>

| Method                 | Path                                                          | Description                                                                                    |
| ------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| POST                     | `/auth/signup`, `/auth/login`, `/auth/refresh`                 | Account + JWT                                                                                    |
| GET/PUT                  | `/auth/me`, `/auth/me/skills`                                    | Profile + saved skills                                                                           |
| PUT                      | `/auth/me/password`                                              | Change password                                                                                  |
| DELETE                   | `/auth/me`                                                        | Delete account                                                                                   |
| POST                     | `/auth/me/resume`                                                 | Upload résumé → extract skills                                                                   |
| GET                      | `/auth/me/history`, `/auth/me/history/progress`                  | Past runs + progress diff                                                                        |
| GET                      | `/auth/me/digest`                                                  | What changed since last run                                                                      |
| POST/GET/DELETE          | `/auth/me/history/{id}/share`, `/auth/me/shared-reports`         | Public report sharing                                                                            |
| GET                      | `/auth/me/saved-jobs`                                             | Bookmarks                                                                                        |
| POST                     | `/recommend`, `/recommend/evidence`                               | Skill-gap recommendations                                                                        |
| POST                     | `/match-score`, `GET /jobs/{id}/match`                            | Match % (role-wide / one posting)                                                                |
| POST                     | `/predict-salary`                                                  | Salary range prediction                                                                          |
| POST/DELETE              | `/jobs/{id}/save`                                                  | Bookmark toggle                                                                                  |
| POST/GET/PATCH/DELETE    | `/applications`, `/applications/{id}`, `/applications/board`      | Job application tracker (Kanban-style: saved/applied/interviewing/offer/rejected/withdrawn)       |
| POST/GET/DELETE          | `/auth/me/certifications`, `/auth/me/certifications/{id}`         | Certifications on your profile                                                                   |
| GET                      | `/career-plan`                                                      | Skill gap + learning resources + adjacent roles, in one call                                     |

</details>

<details>
<summary><strong>Admin-only endpoints</strong></summary>

| Method      | Path                  | Description                     |
| ------------- | ----------------------- | ---------------------------------- |
| GET           | `/admin/stats`         | Platform-wide aggregate stats      |
| GET           | `/admin/users`         | Searchable/paginated user list     |
| PUT/DELETE    | `/admin/users/{id}`    | Update or remove a user            |

</details>

---

## 🧭 What's next

- [ ] Frontend rebuild — a new UI on the staged fonts/illustrations
- [ ] Live deployment — hosted API, frontend, and production database
- [ ] Admin UI — a real frontend for `/admin/*`
- [ ] Digest delivery — actual email/notifications

---

## ⚠️ Known limitations

<details>
<summary><strong>Click to expand — nothing here is hidden, just tucked away for readability</strong></summary>

- **No frontend right now.** Deliberately removed for a ground-up redesign — `fonts/` and `design-assets/` are staged for it.
- **Trend comparison** spans two 30-day windows on a fixed role set — not a forecast, just a simple comparison until there's months of consistent data.
- **Role matching** tries exact + alias first; the semantic fallback needs one-time network access to download its model, and fails open to plain string matching if that's unavailable.
- **Digest has no email delivery** — the computation is real and usable via the dashboard, but nothing sends it.
- **Admin has no dedicated frontend** — the endpoints work and are tested, just no standalone UI yet.
- **Two skill extractors, not unified** — the pipeline runs the fast taxonomy/regex path only; the spaCy/skillNer NLP path (which can discover skills outside the taxonomy) is a manual step.
- **Seed data isn't production data** — `seed_test_data.py` is for tests/local dev only; real data comes from actually running the pipeline.
- **Tests need two databases** — see the collapsible setup step above.

</details>

---

## 📄 License

MIT — see [LICENSE](LICENSE).

---

⭐ If NextSkill is useful to you, consider starring the repo!

**Dharmi Sapariya** — [@DharmiSapariya](https://github.com/DharmiSapariya)
