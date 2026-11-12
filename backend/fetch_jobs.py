"""Remote OK's public developer feed."""
from datetime import datetime, timezone
import logging
import os
import time

import httpx

from ingestion_batch import SourceBatch, write_snapshot

logger = logging.getLogger("nextskill.ingestion.remoteok")
REMOTEOK_API_URL = "https://remoteok.com/api?tags=dev"
OUTPUT_FILE = os.getenv("REMOTEOK_OUTPUT_FILE", "raw_jobs_dev.json")


def fetch_remoteok_batch(max_retries=3):
    with httpx.Client(headers={"Accept": "application/json"}, follow_redirects=True) as client:
        for attempt in range(max_retries):
            try:
                response = client.get(REMOTEOK_API_URL, timeout=15.0)
                if response.status_code == 200:
                    payload = response.json()
                    if isinstance(payload, list):
                        records = [item for item in payload if not (
                            isinstance(item, dict) and ("legal" in item or "notice" in item)
                        )]
                        return SourceBatch("remoteok", None, datetime.now(timezone.utc), records, 1, 0)
                    logger.warning("Remote OK returned an invalid result envelope")
                elif response.status_code not in (429, 500, 502, 503, 504):
                    logger.warning("Remote OK failed with HTTP %d", response.status_code)
                    break
                else:
                    logger.warning("Remote OK returned HTTP %d", response.status_code)
            except (httpx.RequestError, ValueError):
                logger.warning("Remote OK failed transport or JSON parsing")
            if attempt + 1 < max_retries:
                time.sleep(2 ** (attempt + 1))
    return SourceBatch("remoteok", None, datetime.now(timezone.utc), [], 0, 1)


def fetch_remoteok_postings(max_retries=3):
    batch = fetch_remoteok_batch(max_retries)
    if not batch.requests_succeeded:
        return None
    write_snapshot(OUTPUT_FILE, batch)
    return len(batch.records)


if __name__ == "__main__":
    raise SystemExit(int(fetch_remoteok_postings() is None))
