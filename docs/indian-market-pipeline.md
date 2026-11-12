# Stage 3 data-pipeline audit

## Architecture at the base commit

APScheduler runs daily at 03:00 UTC by default, coalesces missed invocations
within its grace period and limits concurrent instances within one scheduler.
It forks a worker to run the pipeline. Its separate heartbeat only confirms
process liveness. The fetchers write independent JSON files. Adzuna fetches
multiple pages for tracked role terms, then drops repeated IDs. Remote OK
fetches the developer-tag feed and writes a different file. The loader opens
only the Adzuna file. The orchestrator can therefore log a Remote OK fetch and
never insert its records. Missing credentials stop the old pipeline before
Remote OK. Adzuna failures can collapse to empty pages, and the loader returns
zero for a missing or malformed file. Older payload files can outlive a fetch.

PostgreSQL stores globally unique external IDs, posting dates, a source,
free-text location, nullable raw salary bounds and company relationships.
There is no collection history, verified geographic scope or provider
expiry field. The pipeline adds regex-derived skill links and merges skill
names by case. Its extractor appends links even if a description changes.
The historical market endpoints aggregate stored job rows, with date windows
on trends but without a common current-market cohort. Salary training uses
role/title buckets, skills and eligible salary midpoints with unverified units.
Redis caches selected aggregates with TTLs and fails open. It is not a source
of ingestion state or freshness.

## Provider evidence

| Provider | Observed contract | Operational and usage constraints |
|---|---|---|
| Adzuna | Credentialed country search. The official schema lists `in`. The project defaults to it and queries selected role terms. The documented response includes IDs, created dates, location hierarchy, salary bounds, redirect URL and optional contract descriptors. A configured country is request provenance. | Account limits vary by plan. The old fetcher retries transient errors without a reliable partial-fetch signal. Publication and ongoing use are subject to the provider's attribution and licensing terms. Confirm the intended use and any required agreement before production. |
| Remote OK | Public remote-job feed filtered by developer tag. The public payload exposes ID, date, URL, title, company, tags, location text and raw salary bounds. Blank, generic and city/region strings are observed. The payload does not guarantee a structured eligibility list or currency/pay period. | The provider requests credit and a followed link to each original Remote OK posting. No numerical limit was verified. The adapter uses bounded retries for throttling/transient failures and retains original links. |

Provider sources: [Adzuna OpenAPI](https://developer.adzuna.com/swagger/spec/test2.json),
[search example](https://developer.adzuna.com/docs/search),
[Adzuna terms](https://developer.adzuna.com/docs/terms_of_service),
[Remote OK FAQ](https://remoteok.com/faq), [feed](https://remoteok.com/api),
and [Remote OK terms](https://remoteok.com/legal).

## India coverage at audit time

No production PostgreSQL connection or Adzuna credentials were supplied.
Bengaluru, Hyderabad, Chennai, Pune, Mumbai, Delhi NCR, other Indian cities,
and India-eligible remote coverage are **unmeasured**. A provider's search
configuration, a successful HTTP response, and the isolated test database
do not establish observed production coverage. No production coverage
percentage or deduplication accuracy can be calculated without verified
records and a labeled comparison sample.

## Stage 3 design

- The scheduler passes validated fetch batches directly to PostgreSQL. Adzuna
  pages report separate successful and failed request counts. A source can
  commit valid rows while reporting a partial run. The other source can
  still run. JSON snapshots are for manual use. An Adzuna snapshot import
  does not advance a source's freshness.
- Each source batch atomically writes jobs, provider observations, managed
  skill links and its run record. A write error rolls all those changes back.
  Failure is recorded in a separate transaction when PostgreSQL is available.
  Logs report outcomes and error types without provider credentials or payloads.
  The scheduler reports partial and failed runs as errors. Provider requests
  have bounded retries. An outage that outlasts retries waits for the next
  cron run or an operator-triggered run. PostgreSQL advisory locks prevent
  overlapping pipeline workers and serialize source writes.
- A stable provider ID identifies a source observation. An exact normalized
  URL, company, title, location, geography and date can link observations to
  the same canonical job. The URL query is retained to avoid assuming query
  parameters are tracking-only. Original source URLs stay with observations.
  Similar titles, ambiguous identifiers, differing aggregator URLs and old
  rows without evidence remain separate. The ingest does not merge existing
  historical rows or remap already-linked observations as descriptions evolve.
  No production precision or recall figure is available. Test fixtures cover
  an exact cross-source match and similar postings that stay separate.
- Adzuna needs a structured India location hierarchy to classify a posting
  as India-based. Explicit remote cues in the title or location leave it
  unknown. City names come from exact aliases in that hierarchy. Remote OK
  needs the exact location label India or Worldwide for India-eligible
  remote, or an exact allowlisted non-India country label for international-only
  remote. Other labels stay unknown. These are provider-declared signals.
  Confirm eligibility with the employer. Requested Adzuna country is recorded
  separately from the posting's geographic classification. Experience bands
  are inferred from titles and do not establish years of experience.
- Posting date is the first usable date seen for an observation. First
  collection and latest observation are separate UTC timestamps. Neither
  adapter has a verified expiry field to import, so expiry stays null.
  The report defines recent as observed in the last 30 days without a known
  expiry at or before the report time. Known observations outside that rule
  are stale or expired. Legacy rows without a timestamp are unknown.
  A recently observed posting can already be closed. Records are retained.
- The report counts canonical jobs and distinct canonical jobs mentioning
  each normalized skill. The default cohort covers India-based and
  India-eligible remote records. Optional posting bounds apply to both the
  skill numerator and its denominator. The existing regex skill dictionary
  refreshes its managed links on description changes and safely handles
  absent descriptions. The report excludes known test/demo records.
  The established Trends and Companies endpoints continue to report their
  historical scopes. They do not claim India coverage.
- Positive, ordered salary bounds can be retained as raw data. Unknown and
  invalid ranges remain null. Remote OK salary rows are excluded from model
  training because the feed does not establish comparable currency or pay
  periods. Existing salary estimates still withhold amounts when those
  units are unverified.
- PostgreSQL holds authoritative run history. Redis is still optional and
  cache invalidation is best effort after commits. A Redis outage can leave
  older cached aggregates until their TTL. A heartbeat is process liveness
  only. Use last run status and last successful ingestion per source to
  monitor freshness. A completed empty response is a successful request
  and is recorded with zero fetched rows. An invalid payload or all
  rejected rows does not advance last success.

## Migration and operation

Base Git commit is `b0ea2c1d3bf861dcecb158752ec5045849aa7135`.
Run `python -m alembic upgrade head` from `backend` before deploying the API
or scheduler. Revision `72bd093f61a0` adds four nullable job fields,
`job_observations`, `ingestion_runs`, and their constraints and indexes.
Existing IDs and saved-job references stay intact. Downgrade removes the
Stage 3 provenance and run history and should be treated as destructive to
those new records.

For a staging trial, configure the database connection and licensed Adzuna
credentials. Verify the account quota against configured pages and tracked
terms. Remote OK ingestion is opt-in with `REMOTEOK_ENABLED=true`. Review
provider terms and attribution across the deployment's surfaces before
enabling or redistributing provider data. The React Jobs views link to
original Remote OK postings and show available observation dates.

From `backend`, run:

```sh
python pipeline.py
python india_market_report.py
python india_market_report.py --posted-from 2026-10-01 --posted-before 2026-11-01
```

The report includes known city counts, unresolved Indian cities, observation
age, separate geography groups, posting and observation windows, normalized
skill counts, and last source outcome. The Jobs API also accepts optional
`geography` and `fresh_only=true` filters and exposes source details
additively. The filters use the same 30-day observation rule.

Before making public coverage claims, run the report against verified
production observations, review unmatched geographic strings, and manually
label a duplicate sample. Observe scheduled runs with deployment credentials
and Redis, validate provider quotas and terms, and alert on failed runs and
on the age of each source's last successful refresh. Current fixture evidence
supports the implementation checks only.

## Files in this patch

| Area | Files |
|---|---|
| Provider adapters | `backend/fetch_adzuna.py`, `backend/fetch_jobs.py`, `backend/ingestion_batch.py` |
| Normalization and persistence | `backend/job_normalization.py`, `backend/load_data.py`, `backend/models.py`, `backend/migrations/versions/72bd093f61a0_add_source_observations.py` |
| Orchestration and configuration | `backend/pipeline.py`, `backend/scheduler.py`, `backend/cache.py`, `backend/.env.example`, `backend/docker-compose.yml` |
| Reporting and salary inputs | `backend/india_market_report.py`, `backend/api.py`, `backend/train_salary_model.py` |
| Existing workspace provenance | `frontend/src/app/MarketMetadata.jsx`, `frontend/src/app/pages/JobDetail.jsx`, `frontend/src/app/pages/Jobs.jsx` |
| Regression tests | `backend/test_india_ingestion.py`, `backend/test_pipeline.py`, `backend/test_cache.py`, `backend/test_seniority.py`, `frontend/tests/market-transparency.spec.js` |
| Audit and operation | `docs/indian-market-pipeline.md` |
