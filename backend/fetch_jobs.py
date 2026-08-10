import httpx
import json

response = httpx.get(
    "https://remoteok.com/api?tags=dev",
    headers={"User-Agent": "job-market-intel-project"}
)
data = response.json()

with open("raw_jobs_dev.json", "w") as f:
    json.dump(data, f, indent=2)

print(f"Saved {len(data)} items to raw_jobs_dev.json")
