# Career Plan API

`GET /career-plan?target_role=software%20engineer` generates a plan for one
target role per request. The required query parameter is a string. The
endpoint accepts free text and applies the existing role resolver. The API
does not set a minimum length, so the workspace rejects blank input before
sending a request.

Send the existing bearer access token. FastAPI validates the token and derives
the user from its subject. The endpoint reads that user's saved skills and
does not accept a user ID or a plan ID. There is no Career Plan table,
ownership relationship, or persisted plan to enumerate or mutate. Generating
another plan means sending a new request with a different role or updated
profile skills. The route uses the existing rate limiter at 10 requests per
minute.

| Response field | Meaning |
|---|---|
| `target_role` | Submitted role text. |
| `role_resolution` | Resolved role, `matched_semantically` flag, and nullable `similarity`. Aliases can resolve without a vector score. |
| `your_skills` | Skills from the authenticated user's profile. An empty array means none are saved. |
| `total_market_jobs` | Number of ingested postings matching the resolved role. Zero means there are no matching postings. |
| `skill_gaps` | Up to 10 ranked recommendations. Each includes `skill_id`, `skill`, `postings_mentioning_it`, `market_demand_pct`, and `resources` with `platform`, `type`, and `url`. Search links are platform searches. |
| `adjacent_roles` | Up to five tracked roles with `role`, `similarity`, `skills_you_have`, and `skills_you_would_need`. These two skill arrays compare role profiles, not the user's saved skills. |

The existing auth dependency rejects missing or invalid credentials. A missing
query parameter receives HTTP 422 and rate limiting can return 429. A role
without matching postings can return HTTP 200 with empty gaps. The React
workspace rechecks the profile through its existing session recovery when
this endpoint returns 401. Other errors stay on the page.

The endpoint provides no list, create, read-by-ID, update, or delete
operations, and no milestones, completion tracking, or saved goals. Sources
are `backend/api.py`, `backend/recommend.py`, `backend/role_matcher.py`,
`backend/role_graph.py`, `backend/learning_resources.py`, and
`backend/auth.py`. Existing backend coverage lives in `backend/test_api.py`.
