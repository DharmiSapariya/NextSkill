"""Conservative normalization of provider records, with no geocoding guesses."""
from datetime import datetime
from decimal import Decimal, InvalidOperation
from hashlib import sha256
from html import unescape
import json
import re
from urllib.parse import urlsplit, urlunsplit

from seniority import infer_seniority

INDIA_CITIES = ("Bengaluru", "Hyderabad", "Chennai", "Pune", "Mumbai", "Delhi NCR")
_CITY_NAMES = {name.casefold(): name for name in INDIA_CITIES}
OTHER_INDIA_CITIES = ("Ahmedabad", "Kolkata", "Kochi", "Jaipur", "Chandigarh", "Lucknow", "Indore", "Coimbatore", "Nagpur", "Surat", "Bhubaneswar", "Thiruvananthapuram")
_CITY_NAMES.update({name.casefold(): name for name in OTHER_INDIA_CITIES})
_CITY_NAMES.update({
    "bangalore": "Bengaluru", "bangalore urban": "Bengaluru",
    "delhi": "Delhi NCR", "new delhi": "Delhi NCR", "gurgaon": "Delhi NCR",
    "gurugram": "Delhi NCR", "noida": "Delhi NCR", "greater noida": "Delhi NCR",
    "faridabad": "Delhi NCR", "ghaziabad": "Delhi NCR",
    "bombay": "Mumbai", "madras": "Chennai", "poona": "Pune",
})
_REMOTE = re.compile(r"\b(remote|work from home|wfh)\b", re.IGNORECASE)
_REMOTE_OUTSIDE_INDIA = {
    "australia", "brazil", "canada", "france", "germany", "japan", "mexico",
    "netherlands", "singapore", "spain", "united kingdom", "united states", "usa", "uk",
}


def clean_text(value):
    if not isinstance(value, str):
        return None
    return unescape(value).replace("\x00", "").strip() or None


def mapping(value):
    return value if isinstance(value, dict) else {}


def posting_date(value):
    if not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
    except ValueError:
        return None


def normalize_url(value):
    if not isinstance(value, str) or any(c.isspace() or ord(c) < 32 for c in value) or "\\" in value:
        return None
    try:
        parts = urlsplit(value)
        if parts.scheme not in ("https", "http") or not parts.hostname or parts.username is not None:
            return None
        if parts.port not in (None, 443 if parts.scheme == "https" else 80):
            return None
        return urlunsplit((parts.scheme, parts.hostname.lower(), parts.path, parts.query, ""))
    except ValueError:
        return None


def salary_bounds(record):
    try:
        low = Decimal(str(record.get("salary_min")))
        high = Decimal(str(record.get("salary_max")))
        if low.is_finite() and high.is_finite() and Decimal("0.01") <= low <= high <= Decimal("9999999999.99"):
            return low, high
    except (InvalidOperation, TypeError, ValueError):
        pass
    return None, None


def classify_geography(source, area, location, title):
    if source == "remoteok":
        eligibility = (location or "").casefold()
        if eligibility in {"india", "worldwide"}:
            return "india_eligible_remote", None
        if eligibility in _REMOTE_OUTSIDE_INDIA:
            return "international_only_remote", None
        return "unknown", None

    if area and area[0].casefold() == "india" and not any(
        _REMOTE.search(value or "") for value in [title, location, *area]
    ):
        matches = {_CITY_NAMES[value.casefold()] for value in area[1:] if value.casefold() in _CITY_NAMES}
        return "india_based", next(iter(matches)) if len(matches) == 1 else None
    return "unknown", None


def experience_band(title):
    if re.search(r"\b(intern|internship)\b", title, re.IGNORECASE):
        return "internship"
    if re.search(r"\bfreshers?\b", title, re.IGNORECASE):
        return "fresher"
    if re.search(r"\bentry[ -]level\b", title, re.IGNORECASE):
        return "entry_level"
    inferred = infer_seniority(title)
    return {"junior": "entry_level", "mid": "experienced", "senior": "experienced"}.get(inferred, "unknown")


def normalize_record(source, raw):
    if not isinstance(raw, dict):
        return None
    raw_id = raw.get("id")
    source_id = str(raw_id).strip() if type(raw_id) in (int, str) else ""
    remote = source == "remoteok"
    title = clean_text(raw.get("position" if remote else "title"))
    if not source_id or "\x00" in source_id or len(source_id) > 200 or not title or len(title) > 255:
        return None

    location_field = mapping(raw.get("location"))
    location = clean_text(raw.get("location") if remote else location_field.get("display_name"))
    hierarchy = location_field.get("area")
    area = [value.strip() for value in hierarchy] if (
        isinstance(hierarchy, list) and all(isinstance(value, str) and value.strip() for value in hierarchy)
    ) else []
    company = clean_text(raw.get("company") if remote else mapping(raw.get("company")).get("display_name"))
    url = normalize_url(raw.get("url" if remote else "redirect_url"))
    if remote and (not url or urlsplit(url).hostname != "remoteok.com" or not urlsplit(url).path.startswith("/remote-jobs/")):
        return None

    date = posting_date(raw.get("date" if remote else "created"))
    geography, city = classify_geography(source, area, location, title)
    description = clean_text(raw.get("description"))
    if remote and description:
        description = re.sub(r"<[^>]+>", " ", description)
    low, high = salary_bounds(raw)
    contract_type = clean_text(raw.get("contract_type")) if not remote else None
    contract_time = clean_text(raw.get("contract_time")) if not remote else None
    if remote:
        tags = raw.get("tags")
        if isinstance(tags, list):
            times = {"full time", "part time"} & {tag.casefold().strip() for tag in tags if isinstance(tag, str)}
            contract_time = next(iter(times)) if len(times) == 1 else None

    fingerprint = None
    if url and company and location and date:
        fields = [url, company.casefold(), title.casefold(), location.casefold(), geography, date.isoformat()]
        fingerprint = sha256(json.dumps(fields).encode()).hexdigest()
    category = clean_text(mapping(raw.get("category")).get("label"))
    return {
        "source_id": source_id,
        "company": company[:255] if company else None,
        "title": title,
        "location": location[:255] if location else None,
        "description": description,
        "category": category[:100] if category else None,
        "source_url": url,
        "location_evidence": {"area": area, "location": location},
        "contract_type": contract_type[:50] if contract_type else None,
        "contract_time": contract_time[:50] if contract_time else None,
        "posted_date": date,
        "geography": geography,
        "market_city": city,
        "experience_band": experience_band(title),
        "salary_min": low,
        "salary_max": high,
        "identity_fingerprint": fingerprint,
    }
