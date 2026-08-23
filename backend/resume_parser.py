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


# Below this many extracted characters, treat it as extraction failure
# rather than "a very short resume." The realistic cause at this level is a
# scanned/image-based PDF: pdfplumber only reads an embedded text layer, so
# a pure image scan silently returns "" — no error, just zero skills found,
# which used to look identical to "a real resume that genuinely lists no
# taxonomy skills" from the caller's side. There's no OCR fallback (would
# need pytesseract + a system tesseract binary — a real dependency this
# environment doesn't have and can't verify, so not attempted here); this
# at least turns a silent wrong answer into an honest, actionable error.
MIN_EXTRACTED_TEXT_CHARS = 50


def extract_text(filename: str, file_bytes: bytes) -> str:
    lower = filename.lower()
    if lower.endswith(".pdf"):
        text = extract_text_from_pdf(file_bytes)
    elif lower.endswith(".docx"):
        text = extract_text_from_docx(file_bytes)
    else:
        raise ValueError("Unsupported resume format — upload a PDF or DOCX file.")

    if len(text.strip()) < MIN_EXTRACTED_TEXT_CHARS:
        raise ValueError(
            "Couldn't extract readable text from this file — it may be a scanned/image-based "
            "PDF (not supported yet) or empty/corrupted. Try a text-based PDF or DOCX export instead."
        )
    return text


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
