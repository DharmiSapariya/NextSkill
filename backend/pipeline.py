"""Orchestrates the ingestion pipeline: fetch new postings, load them,
extract skills, merge duplicates. This is what run manually via the README's
"Getting Started" steps up to now; scheduler.py runs this automatically
instead.

Deliberately excludes extract_skillner.py — that needs spaCy/skillNer
(requirements-nlp.txt, not installed by default) and is a heavier NLP pass
meant to be run deliberately, not on every scheduled tick. The scheduled
pipeline uses extract_languages.py's lightweight regex matching only.
"""
from fetch_adzuna import fetch_postings
from load_data import load_postings
from extract_languages import extract_supplementary_skills
from merge_duplicate_skills import merge_duplicate_skills


def run_full_pipeline() -> dict:
    fetched = fetch_postings()
    if fetched is None:
        return {"status": "skipped", "reason": "ADZUNA_APP_ID / ADZUNA_APP_KEY not set"}
    if fetched == 0:
        return {"status": "no_new_data", "fetched": 0}

    inserted, skipped = load_postings()
    matches = extract_supplementary_skills()
    merged = merge_duplicate_skills()

    return {
        "status": "ok",
        "fetched": fetched,
        "inserted": inserted,
        "skipped_duplicates": skipped,
        "skill_matches_added": matches,
        "duplicate_skills_merged": merged,
    }


if __name__ == "__main__":
    result = run_full_pipeline()
    print(f"\nPipeline result: {result}")
