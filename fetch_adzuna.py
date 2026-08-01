import httpx
import json
import os
import time
from dotenv import load_dotenv

load_dotenv()

APP_ID = os.getenv("ADZUNA_APP_ID")
APP_KEY = os.getenv("ADZUNA_APP_KEY")

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

all_results = []

for term in SEARCH_TERMS:
    for page in range(1, PAGES_PER_TERM + 1):
        url = f"https://api.adzuna.com/v1/api/jobs/in/search/{page}"
        params = {
            "app_id": APP_ID,
            "app_key": APP_KEY,
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

with open("raw_jobs_adzuna.json", "w") as f:
    json.dump({"results": all_results}, f, indent=2)

print(f"\nTotal saved: {len(all_results)} postings to raw_jobs_adzuna.json")
