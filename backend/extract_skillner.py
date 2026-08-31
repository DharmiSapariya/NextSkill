import logging
import time
from typing import Dict, Set, Tuple
import spacy
from spacy.matcher import PhraseMatcher
from sqlalchemy.orm import Session
from skillNer.general_params import SKILL_DB
from skillNer.skill_extractor_class import SkillExtractor

from models import Job, JobSkill, Skill, get_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nextskill.skillner")

BATCH_SIZE = 200


def process_skillner_extractions(db: Session):
    logger.info("Loading SpaCy pipeline (en_core_web_lg)...")
    nlp = spacy.load("en_core_web_lg")
    skill_extractor = SkillExtractor(nlp, SKILL_DB, PhraseMatcher)

    # 1. Safely truncate existing associations in order
    logger.info("Clearing legacy JobSkill associations...")
    db.query(JobSkill).delete(synchronize_session=False)
    db.commit()

    # 2. Pre-load all existing Skills into memory cache (keyed by lower-case name)
    existing_skills = db.query(Skill).all()
    skill_name_cache: Dict[str, Skill] = {s.name.lower(): s for s in existing_skills}

    # 3. Pre-load all existing JobSkill tuples into a set for O(1) duplicate checks
    existing_job_skills: Set[Tuple[int, int]] = set(
        db.query(JobSkill.job_id, JobSkill.skill_id).all()
    )

    # 4. Count total target jobs
    total_jobs = db.query(Job).filter(Job.description.isnot(None)).count()
    logger.info(f"Processing {total_jobs} job descriptions with skillNer...")

    start_time = time.time()
    total_matches = 0
    pending_job_skills = []

    # Stream jobs to keep memory footprint flat
    job_stream = (
        db.query(Job.id, Job.description)
        .filter(Job.description.isnot(None))
        .yield_per(BATCH_SIZE)
    )

    for i, (job_id, description) in enumerate(job_stream, 1):
        if not description or not description.strip():
            continue

        try:
            annotations = skill_extractor.annotate(description)
        except Exception as exc:
            logger.debug(f"Skipping job_id={job_id} due to skillNer parsing error: {exc}")
            continue

        results = annotations.get("results", {})
        
        # Extract both full matches and high-confidence n-grams
        full_matches = results.get("full_matches", [])
        ngram_matches = results.get("ngram_scored", [])
        
        extracted_terms = set()
        
        for match in full_matches:
            val = match.get("doc_node_value")
            if val:
                extracted_terms.add(val.strip())

        for match in ngram_matches:
            # High-confidence ngram threshold check
            if match.get("score", 0) >= 0.6:
                val = match.get("doc_node_value")
                if val:
                    extracted_terms.add(val.strip())

        for term in extracted_terms:
            term_key = term.lower()
            
            # Resolve or create Skill record
            if term_key not in skill_name_cache:
                new_skill = Skill(name=term)
                db.add(new_skill)
                db.flush()  # Assigns ID without full commit
                skill_name_cache[term_key] = new_skill
            
            skill = skill_name_cache[term_key]

            # Fast in-memory deduplication
            if (job_id, skill.id) not in existing_job_skills:
                pending_job_skills.append({"job_id": job_id, "skill_id": skill.id})
                existing_job_skills.add((job_id, skill.id))
                total_matches += 1

        # Periodic bulk insert and commit
        if i % BATCH_SIZE == 0:
            if pending_job_skills:
                db.bulk_insert_mappings(JobSkill, pending_job_skills)
                pending_job_skills.clear()
            db.commit()

            elapsed = time.time() - start_time
            rate = i / elapsed
            remaining_min = ((total_jobs - i) / rate) / 60
            logger.info(
                f"Progress: {i}/{total_jobs} jobs ({i/total_jobs*100:.1f}%) | "
                f"Matches: {total_matches} | ~{remaining_min:.1f} min left"
            )

    # Final commit for remaining records
    if pending_job_skills:
        db.bulk_insert_mappings(JobSkill, pending_job_skills)
        db.commit()

    elapsed = time.time() - start_time
    logger.info(
        f"Completed in {elapsed/60:.1f} minutes. "
        f"Saved {total_matches} total skill mentions across {total_jobs} jobs."
    )


if __name__ == "__main__":
    from models import SessionLocal
    db = SessionLocal()
    try:
        process_skillner_extractions(db)
    finally:
        db.close()