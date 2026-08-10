"""Extracts skills from an uploaded resume (PDF or DOCX).

Reuses the same taxonomy-based regex matching already used against job
postings (see extract_languages.py / extract_skills.py) so a resume and a
job posting are scored against the same skill vocabulary.
"""
import io
import re

import pdfplumber
from docx import Document

from skills_taxonomy import SKILLS_TAXONOMY

# Same short/common tokens extract_languages.py adds for job postings, so a
# resume isn't penalized for using different phrasing than the taxonomy.
SUPPLEMENTARY_SKILLS = [
    "Python", "Java", "JavaScript", "TypeScript", "Go", "Rust",
    "Swift", "Kotlin", "PHP", "Ruby", "Scala", "R", "C++", "C#",
    "SQL", "HTML", "CSS", "React", "Docker", "Kubernetes", "AWS",
    "Azure", "GCP", "Git", "Linux", "MongoDB", "PostgreSQL", "MySQL",
]

ALL_SKILLS = sorted(set(SKILLS_TAXONOMY) | set(SUPPLEMENTARY_SKILLS), key=len, reverse=True)


def extract_text_from_pdf(file_bytes: bytes) -> str:
    text_parts = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            text_parts.append(page.extract_text() or "")
    return "\n".join(text_parts)


def extract_text_from_docx(file_bytes: bytes) -> str:
    document = Document(io.BytesIO(file_bytes))
    return "\n".join(paragraph.text for paragraph in document.paragraphs)


def extract_text(filename: str, file_bytes: bytes) -> str:
    lower = filename.lower()
    if lower.endswith(".pdf"):
        return extract_text_from_pdf(file_bytes)
    if lower.endswith(".docx"):
        return extract_text_from_docx(file_bytes)
    raise ValueError("Unsupported resume format — upload a PDF or DOCX file.")


def extract_skills_from_text(text: str) -> list[str]:
    found = []
    for skill in ALL_SKILLS:
        pattern = r"\b" + re.escape(skill) + r"\b"
        if re.search(pattern, text, re.IGNORECASE):
            found.append(skill)
    return found


def parse_resume(filename: str, file_bytes: bytes) -> list[str]:
    """Returns the list of taxonomy skills found in the resume."""
    text = extract_text(filename, file_bytes)
    return extract_skills_from_text(text)
