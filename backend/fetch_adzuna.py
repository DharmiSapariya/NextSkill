import asyncio
import json
import logging
import os
from typing import Any, Dict, List, Optional, Set
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
ADZUNA_COUNTRY = os.getenv("ADZUNA_COUNTRY", "in").lower()

# Maximum concurrent network requests to prevent API rate limit blocks
MAX_CONCURRENT_REQUESTS = 5


async def _fetch_page_with_retry(
    client: httpx.AsyncClient,
    semaphore: asyncio.Semaphore,
    term: str,
    page: int,
    app_id: str,
    app_key: str,
    max_retries: int = 3,
) -> List[Dict[str, Any]]:
    """Fetches a single search page with exponential backoff for rate limits and intermittent errors."""
    url = f"https://api.adzuna.com/v1/api/jobs/{ADZUNA_COUNTRY}/search/{page}"
    params = {
        "app_id": app_id,
        "app_key": app_key,
        "results_per_page": RESULTS_PER_PAGE,
        "what": term,
        "content-type": "application/json",
    }

    async with semaphore:
        for attempt in range(1, max_retries + 1):
            try:
                response = await client.get(url, params=params, timeout=10.0)

                if response.status_code == 200:
                    data = response.json()
                    results = data.get("results", [])
                    logger.debug(f"[{term}] Page {page}: fetched {len(results)} items")
                    return results

                elif response.status_code in (429, 500, 502, 503, 504):
                    wait_time = 2 ** attempt
                    logger.warning(
                        f"[{term}] Page {page}: Received HTTP {response.status_code}. "
                        f"Retrying in {wait_time}s (Attempt {attempt}/{max_retries})..."
                    )
                    await asyncio.sleep(wait_time)

                else:
                    logger.error(
                        f"[{term}] Page {page}: Permanent failure HTTP {response.status_code}"
                    )
                    return []

            except (httpx.RequestError, json.JSONDecodeError) as exc:
                wait_time = 2 ** attempt
                logger.warning(
                    f"[{term}] Page {page}: Network/Parsing error '{exc}'. "
                    f"Retrying in {wait_time}s..."
                )
                await asyncio.sleep(wait_time)

        logger.error(f"[{term}] Page {page}: Failed after {max_retries} attempts.")
        return []


async def fetch_postings_async() -> Optional[int]:
    """Asynchronously fetches job postings across all target roles, deduplicates by Adzuna ID,
    and writes results atomically to disk."""
    app_id = os.getenv("ADZUNA_APP_ID")
    app_key = os.getenv("ADZUNA_APP_KEY")

    if not app_id or not app_key:
        logger.error("ADZUNA_APP_ID / ADZUNA_APP_KEY not set — skipping fetch operation.")
        return None

    semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)
    seen_job_ids: Set[str] = set()
    deduplicated_results: List[Dict[str, Any]] = []

    logger.info(
        f"Starting Adzuna ingestion | Region: {ADZUNA_COUNTRY} | "
        f"Terms: {len(SEARCH_TERMS)} | Pages/Term: {PAGES_PER_TERM}"
    )

    async with httpx.AsyncClient() as client:
        # Schedule all requests concurrently
        tasks = [
            _fetch_page_with_retry(client, semaphore, term, page, app_id, app_key)
            for term in SEARCH_TERMS
            for page in range(1, PAGES_PER_TERM + 1)
        ]

        # Process results as they complete
        pages_results = await asyncio.gather(*tasks)

        for page_jobs in pages_results:
            for job in page_jobs:
                job_id = str(job.get("id"))
                if job_id and job_id not in seen_job_ids:
                    seen_job_ids.add(job_id)
                    deduplicated_results.append(job)

    # Write output atomically using temporary file rename
    temp_output_file = f"{OUTPUT_FILE}.tmp"
    try:
        with open(temp_output_file, "w", encoding="utf-8") as f:
            json.dump({"results": deduplicated_results}, f, indent=2, ensure_ascii=False)
        os.replace(temp_output_file, OUTPUT_FILE)
    except Exception as exc:
        logger.error(f"Failed to write results to disk: {exc}")
        if os.path.exists(temp_output_file):
            os.remove(temp_output_file)
        raise exc

    logger.info(
        f"Ingestion complete: Saved {len(deduplicated_results)} unique job postings "
        f"to {OUTPUT_FILE} (Deduplicated from {sum(len(p) for p in pages_results)} raw records)."
    )
    return len(deduplicated_results)


def fetch_postings() -> Optional[int]:
    """Synchronous entry point wrapper."""
    return asyncio.run(fetch_postings_async())


if __name__ == "__main__":
    fetch_postings()