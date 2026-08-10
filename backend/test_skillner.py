import spacy
from spacy.matcher import PhraseMatcher
from skillNer.general_params import SKILL_DB
from skillNer.skill_extractor_class import SkillExtractor
from models import Job, session

nlp = spacy.load("en_core_web_lg")
skill_extractor = SkillExtractor(nlp, SKILL_DB, PhraseMatcher)

job = session.query(Job).filter(Job.title.ilike("%data scientist%")).first()
print(f"Testing on: {job.title}\n")

annotations = skill_extractor.annotate(job.description)
print(annotations)
