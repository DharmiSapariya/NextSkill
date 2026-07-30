import httpx
import json
import os
from dotenv import load_dotenv

load_dotenv()

APP_ID = os.getenv("ADZUNA_APP_ID")
APP_KEY = os.getenv("ADZUNA_APP_KEY")

url = "https://api.adzuna.com/v1/api/jobs/in/search/1"
params = {
    "app_id": APP_ID,
    "app_key": APP_KEY,
    "results_per_page": 50,
    "what": "software engineer",
    "content-type": "application/json",
}

response = httpx.get(url, params=params)
data = response.json()

with open("raw_jobs_adzuna.json", "w") as f:
    json.dump(data, f, indent=2)

print(f"Status: {response.status_code}")
print(f"Saved {len(data.get('results', []))} items to raw_jobs_adzuna.json")
