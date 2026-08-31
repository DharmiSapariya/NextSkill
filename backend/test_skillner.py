"""Skill extraction validation suite using SpaCy and skillNER.

Provides isolated unit tests for skill annotation pipelines as well as an
executable CLI utility for inspecting entity extraction on target job descriptions.
"""

import sys
from typing import Dict, Any, List
import pytest
import spacy
from spacy.matcher import PhraseMatcher
from skillNer.general_params import SKILL_DB
from skillNer.skill_extractor_class import SkillExtractor

from models import Job, SessionLocal


# --- Lazy Model & Extractor Initialization ---

_nlp = None
_skill_extractor = None


def get_skill_extractor() -> SkillExtractor:
    """Lazy-loads and caches SpaCy NLP pipeline and skillNER extractor instance."""
    global _nlp, _skill_extractor
    if _skill_extractor is None:
        # Load core English model; fall back to sm if lg is unavailable
        try:
            _nlp = spacy.load("en_core_web_lg")
        except OSError:
            _nlp = spacy.load("en_core_web_sm")
        _skill_extractor = SkillExtractor(_nlp, SKILL_DB, PhraseMatcher)
    return _skill_extractor


def extract_skills_from_text(text: str) -> Dict[str, Any]:
    """Annotates text input and parses high-confidence full and sub-skill matches."""
    extractor = get_skill_extractor()
    annotations = extractor.annotate(text)
    
    full_matches = [
        match.get("doc_node_value")
        for match in annotations.get("results", {}).get("full_matches", [])
    ]
    ngram_matches = [
        match.get("doc_node_value")
        for match in annotations.get("results", {}).get("ngram_scored", [])
    ]
    
    return {
        "raw_annotations": annotations,
        "full_matches": full_matches,
        "ngram_matches": ngram_matches,
    }


# --- Pytest Unit Tests ---

@pytest.fixture
def db_session():
    """Provides a transactional database session rolled back automatically post-test."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


def test_skill_extractor_identifies_core_data_science_skills():
    """Verifies that the skillNER pipeline correctly extracts standard technical skills from text."""
    sample_description = (
        "We are looking for a Data Scientist proficient in Python, SQL, and Machine Learning. "
        "Experience with Docker and AWS is preferred."
    )
    result = extract_skills_from_text(sample_description)
    
    all_extracted = [s.lower() for s in result["full_matches"] + result["ngram_matches"]]
    
    # Assert key technical competencies are captured
    assert any("python" in s for s in all_extracted)
    assert any("sql" in s for s in all_extracted)


def test_database_job_description_skill_extraction(db_session):
    """Verifies skill extraction against a database-backed Job entity with graceful fallback."""
    job = db_session.query(Job).filter(Job.title.ilike("%data scientist%")).first()
    
    if job is None or not job.description:
        pytest.skip("No Data Scientist job postings found in test database; skipping live DB test.")
    
    result = extract_skills_from_text(job.description)
    assert isinstance(result["full_matches"], list)


# --- Standalone CLI Script Runner ---

def run_diagnostic_cli(role_query: str = "%data scientist%"):
    """CLI helper to query the database and format skillNER annotations nicely in terminal output."""
    session = SessionLocal()
    try:
        job = session.query(Job).filter(Job.title.ilike(role_query)).first()
        
        if not job:
            print(f"[!] Warning: No job title matching query '{role_query}' was found in the database.")
            print("[*] Running diagnostic extraction on default fallback sample text instead...\n")
            text_to_test = "Seeking a Data Scientist skilled in Python, R, TensorFlow, SQL, and Apache Spark."
            title = "Fallback Sample Posting"
        else:
            text_to_test = job.description or ""
            title = job.title

        print("=" * 60)
        print(f"Testing Skill Extraction on: {title}")
        print("=" * 60)

        if not text_to_test.strip():
            print("[!] Error: Job description is empty.")
            return

        result = extract_skills_from_text(text_to_test)

        print("\n--- Full Skill Matches ---")
        for match in result["full_matches"]:
            print(f"  • {match}")

        print("\n--- N-Gram / Partial Skill Matches ---")
        for match in result["ngram_matches"]:
            print(f"  • {match}")

    finally:
        session.close()


if __name__ == "__main__":
    query = sys.argv[1] if len(sys.argv) > 1 else "%data scientist%"
    run_diagnostic_cli(query)