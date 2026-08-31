import json
import logging
import os
import re
import time
from typing import Any, Dict, List, Optional
import httpx

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("nextskill.ingestion.remoteok")

REMOTEOK_API_URL = "https://remoteok.com/api?tags=dev"
OUTPUT_FILE = os.getenv("REMOTEOK_OUTPUT_FILE", "raw_jobs_dev.json")

# Standard headers required to pass Cloudflare checks cleanly
DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
}


def _clean_html_description(raw_html: Optional[str]) -> str:
    """Strips HTML formatting tags and unescapes text for downstream NLP processing."""
    if not raw_html:
        return ""
    # Strip HTML tags
    clean_text = re.sub(r"<[^>]+>", " ", raw_html)
    # Collapse multiple whitespaces
    return re.sub(r"\s+", " ", clean_text).strip()


def fetch_remoteok_postings(max_retries: int = 3) -> Optional[int]:
    """Fetches, sanitizes, and persists job listings from RemoteOK."""
    logger.info(f"Initiating RemoteOK job ingestion from {REMOTEOK_API_URL}...")

    raw_response_data = None

    with httpx.Client(headers=DEFAULT_HEADERS, follow_redirects=True) as client:
        for attempt in range(1, max_retries + 1):
            try:
                response = client.get(REMOTEOK_API_URL, timeout=15.0)

                if response.status_code == 200:
                    raw_response_data = response.json()
                    break
                elif response.status_code in (429, 500, 502, 503, 504):
                    wait_time = 2 ** attempt
                    logger.warning(
                        f"HTTP {response.status_code} received. "
                        f"Retrying in {wait_time}s (Attempt {attempt}/{max_retries})..."
                    )
                    time.sleep(wait_time)
                else:
                    logger.error(f"Permanent request failure with status code HTTP {response.status_code}")
                    return None

            except (httpx.RequestError, json.JSONDecodeError) as exc:
                wait_time = 2 ** attempt
                logger.warning(f"Fetch failed due to error '{exc}'. Retrying in {wait_time}s...")
                time.sleep(wait_time)

    if not raw_response_data or not isinstance(raw_response_data, list):
        logger.error("Failed to retrieve valid JSON array from RemoteOK API.")
        return None

    sanitized_jobs: List[Dict[str, Any]] = []
    seen_ids = set()

    for item in raw_response_data:
        # Skip legal disclaimers, metadata objects, or non-dict items
        if not isinstance(item, dict) or "legal" in item or "notice" in item:
            continue

        job_id = str(item.get("id") or item.get("epoch", ""))
        if not job_id or job_id in seen_ids:
            continue

        seen_ids.add(job_id)

        # Sanitize essential fields
        description_raw = item.get("description", "")
        sanitized_jobs.append({
            "id": job_id,
            "source": "remoteok",
            "position": item.get("position", "").strip(),
            "company": item.get("company", "").strip(),
            "location": item.get("location", "Remote").strip(),
            "tags": [t.lower().strip() for t in item.get("tags", []) if isinstance(t, str)],
            "date": item.get("date"),
            "url": item.get("url"),
            "raw_description": description_raw,
            "clean_description": _clean_html_description(description_raw),
        })

    # Atomic write to filesystem
    temp_file = f"{OUTPUT_FILE}.tmp"
    try:
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump({"results": sanitized_jobs}, f, indent=2, ensure_ascii=False)
        os.replace(temp_file, OUTPUT_FILE)
    except Exception as exc:
        logger.error(f"Failed to write RemoteOK output file: {exc}")
        if os.path.exists(temp_file):
            os.remove(temp_file)
        raise exc

    logger.info(
        f"RemoteOK Ingestion Complete: Saved {len(sanitized_jobs)} valid job postings "
        f"to {OUTPUT_FILE} (Discarded metadata and duplicates)."
    )
    return len(sanitized_jobs)


if __name__ == "__main__":
    fetch_remoteok_postings()