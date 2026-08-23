import httpx
import json
import os
import time
from dotenv import load_dotenv

load_dotenv()

SEARCH_TERMS = [
    "software engineer",
    "backend developer",
    "frontend developer",
    "full stack developer",
    "data scientist",
    "data analyst",
    "data engineer",
    "machine learning engineer",
    "ai engineer",
    "devops engineer",
    "cloud engineer",
    "site reliability engineer",
    "mobile developer",
    "android developer",
    "ios developer",
    "qa engineer",
    "test automation engineer",
    "cybersecurity analyst",
    "database administrator",
    "product manager",
    "ui ux designer",
]
PAGES_PER_TERM = 3
OUTPUT_FILE = "raw_jobs_adzuna.json"


def fetch_postings():
    """Pulls postings for every tracked role from the Adzuna API and writes
    them to OUTPUT_FILE. Returns the number of postings fetched, or None if
    ADZUNA_APP_ID/ADZUNA_APP_KEY aren't configured (skips rather than
    crashing, so a scheduled run without credentials fails loud in the log
    but doesn't take the rest of a pipeline down with it)."""
    app_id = os.getenv("ADZUNA_APP_ID")
    app_key = os.getenv("ADZUNA_APP_KEY")
    if not app_id or not app_key:
        print("ADZUNA_APP_ID / ADZUNA_APP_KEY not set — skipping fetch.")
        return None

    all_results = []
    for term in SEARCH_TERMS:
        for page in range(1, PAGES_PER_TERM + 1):
            url = f"https://api.adzuna.com/v1/api/jobs/in/search/{page}"
            params = {
                "app_id": app_id,
                "app_key": app_key,
                "results_per_page": 50,
                "what": term,
                "content-type": "application/json",
            }
            response = httpx.get(url, params=params)
            if response.status_code != 200:
                print(f"  Skipped {term} page {page}: status {response.status_code}")
                continue
            data = response.json()
            results = data.get("results", [])
            all_results.extend(results)
            print(f"  {term} page {page}: got {len(results)}")
            time.sleep(1)

    with open(OUTPUT_FILE, "w") as f:
        json.dump({"results": all_results}, f, indent=2)

    print(f"\nTotal saved: {len(all_results)} postings to {OUTPUT_FILE}")
    return len(all_results)


if __name__ == "__main__":
    fetch_postings()
