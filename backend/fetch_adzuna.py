import asyncio
import logging
import os
from datetime import datetime, timezone
from ingestion_batch import SourceBatch, write_snapshot
from dotenv import load_dotenv
import httpx

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("nextskill.ingestion.adzuna")

SEARCH_TERMS = [
    "software engineer", "backend developer", "frontend developer",
    "full stack developer", "data scientist", "data analyst",
    "data engineer", "machine learning engineer", "ai engineer",
    "devops engineer", "cloud engineer", "site reliability engineer",
    "mobile developer", "android developer", "ios developer",
    "qa engineer", "test automation engineer", "cybersecurity analyst",
    "database administrator", "product manager", "ui ux designer",
]

PAGES_PER_TERM = int(os.getenv("ADZUNA_PAGES_PER_TERM", "3"))
RESULTS_PER_PAGE = 50
OUTPUT_FILE = os.getenv("ADZUNA_OUTPUT_FILE", "raw_jobs_adzuna.json")
SUPPORTED_COUNTRIES = set("gb us at au be br ca ch de es fr in it mx nl nz pl sg za".split())
ADZUNA_COUNTRY = os.getenv("ADZUNA_COUNTRY", "in").lower()

# Maximum concurrent network requests to prevent API rate limit blocks
MAX_CONCURRENT_REQUESTS = 5


async def _fetch_page_with_retry(client, semaphore, term, page, app_id, app_key):
    url = f"https://api.adzuna.com/v1/api/jobs/{ADZUNA_COUNTRY}/search/{page}"
    params = {
        "app_id": app_id, "app_key": app_key, "results_per_page": RESULTS_PER_PAGE,
        "what": term, "content-type": "application/json",
    }
    for attempt in range(3):
        try:
            async with semaphore:
                response = await client.get(url, params=params, timeout=10.0)
            if response.status_code == 200:
                payload = response.json()
                records = payload.get("results") if isinstance(payload, dict) else None
                if isinstance(records, list):
                    return records
                logger.warning("Adzuna returned an invalid result envelope for page %d", page)
            elif response.status_code not in (429, 500, 502, 503, 504):
                logger.warning("Adzuna page %d failed with HTTP %d", page, response.status_code)
                return None
            else:
                logger.warning("Adzuna page %d returned HTTP %d", page, response.status_code)
        except (httpx.RequestError, ValueError):
            # The URL can contain provider credentials.
            logger.warning("Adzuna page %d failed transport or JSON parsing", page)
        if attempt < 2:
            await asyncio.sleep(2 ** (attempt + 1))
    return None


async def fetch_batch_async():
    app_id = os.getenv("ADZUNA_APP_ID")
    app_key = os.getenv("ADZUNA_APP_KEY")
    if not app_id or not app_key:
        return None
    if ADZUNA_COUNTRY not in SUPPORTED_COUNTRIES or PAGES_PER_TERM < 1:
        raise ValueError("Invalid Adzuna country or page configuration")

    semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)
    async with httpx.AsyncClient() as client:
        pages = await asyncio.gather(*(
            _fetch_page_with_retry(client, semaphore, term, page, app_id, app_key)
            for term in SEARCH_TERMS
            for page in range(1, PAGES_PER_TERM + 1)
        ))
    valid_pages = [page for page in pages if page is not None]
    return SourceBatch(
        "adzuna", ADZUNA_COUNTRY, datetime.now(timezone.utc),
        [record for page in valid_pages for record in page],
        len(valid_pages), len(pages) - len(valid_pages),
    )


def fetch_batch():
    return asyncio.run(fetch_batch_async())


async def fetch_postings_async():
    batch = await fetch_batch_async()
    if batch is None:
        return None
    write_snapshot(OUTPUT_FILE, batch)
    return len(batch.records)


def fetch_postings():
    return asyncio.run(fetch_postings_async())


if __name__ == "__main__":
    batch = fetch_batch()
    if batch is None:
        raise SystemExit("Adzuna credentials are unavailable")
    write_snapshot(OUTPUT_FILE, batch)
    raise SystemExit(int(bool(batch.requests_failed)))
