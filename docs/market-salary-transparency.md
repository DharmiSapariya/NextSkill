# Market and salary data availability

This audit verifies repository code and schema. It does not establish the
contents, current configuration, or coverage of a deployed database.

| Area | Available evidence | Limit |
|---|---|---|
| Adzuna | The fetcher queries a configurable country endpoint, defaults to `in`, and searches tracked role terms. The loader saves Adzuna IDs, posting dates, locations, and raw salary bounds. | A stored row does not retain the requested country or collection time. Defaults cannot establish where older records were fetched. |
| Remote OK | The fetcher collects the developer feed, de-duplicates payload IDs, and writes a separate file. | The current PostgreSQL loader reads the Adzuna file only. A successful Remote OK fetch does not establish database coverage or India eligibility. |
| Fixtures | Test rows use `seed`; demo rows have `demo-` IDs. Historical demo rows could carry Adzuna or Remote OK labels. | Patch 07 attributes these demo rows separately and labels future demo rows. Never seed fixture data into production. |
| Dates | The nullable posting date is derived from Adzuna's `created` field. Trends use dated core-role records in two 30-day windows. | Collection time, last successful ingestion, and expiry are not stored on postings. The scheduler heartbeat measures liveness. The 30-day notice describes posting age only. |
| Geography and seniority | Location is free text. Metadata counts records with location text and records whose location text contains the word “remote”. Seniority is inferred from titles. | There is no structured country, remote eligibility, internship/fresher flag, or verified years of experience. Location text cannot establish India, city, or remote eligibility coverage. |
| Uniqueness and skills | External posting IDs are unique, and job–skill pairs are unique. The pipeline extracts supplementary skills and merges normalized aliases. Companies count stored job records; trends count skill links in dated records. | Reposts and cross-source duplicates can represent the same opening. Skill extraction does not establish a complete set of employer requirements. |
| Salary | The database stores nullable numerical bounds. The model uses the midpoint of eligible bounds, title-derived role buckets and skill features. The model needs at least 30 eligible observations overall. | Currency, pay period, collection time, and employer verification are unavailable. Location and experience are not model inputs. Mixed currencies and periods cannot be detected or normalized. |

## API additions and compatibility

- `GET /jobs` returns `market_metadata` for the filtered set before pagination. Rows
  and `GET /jobs/{id}` include `posted_date` and `source_attribution`. The existing
  raw `source` remains available.
- `GET /companies` returns the same metadata for postings associated with matching
  companies. Its original `total` still counts companies. The top-company response
  and the independent retry behavior are unchanged. Autocomplete can omit the
  aggregation with `include_market_metadata=false`.
- `GET /trends/{skill}` returns metadata for its dated comparison population.
  A period with no observations returns null `share_pct`, and the comparison
  reports `insufficient_data`. Zero mentions within a populated period still
  means zero share. The trend cache key is versioned for the new response.
- `POST /predict-salary` remains authenticated and returns additive
  `estimate_metadata`. Newly trained models carry sample sizes, recorded source
  counts, latest dated observation and training time. Older artifacts return
  null for unavailable provenance. Training excludes identifiable demo rows
  and incomplete, nonfinite, nonpositive or inverted ranges.
- Legacy numeric prediction fields remain for compatibility. They are in
  unverified source units. The workspace and Streamlit salary views withhold
  monetary amounts. Tree prediction quartiles are descriptive model spread
  and do not establish a confidence interval.
- Metadata exposes aggregate counts and source labels. It does not expose user
  identifiers or raw payloads. There are no new routes, dependencies or
  database migrations.

## Stage 2 completion and deployment

Patches 01–06 are on the base branch. They cover database migration reliability,
mobile navigation, landing-page sample disclosure, authentication recovery,
lazy workspace loading and route recovery, and the authenticated Career Plan
workspace. Patch 07 is delivered as a separate patch for review and application.

Before production deployment, confirm the production environment's ingestion
configuration, source distribution and fixture isolation. Check real posting
dates, ingestion success monitoring, query latency and deployment health. To
publish monetary estimates, establish reliable per-observation currency and pay
period, define comparable training cohorts, and validate the resulting model on
representative data. Until then the workspace withholds monetary figures.
