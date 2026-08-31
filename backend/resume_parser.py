import io
import logging
import re
from typing import List, Set
import pdfplumber
from docx import Document

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nextskill.parsers.resume")

# Maximum permitted file size in bytes (10 MB limit)
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
MIN_EXTRACTED_TEXT_CHARS = 50

SUPPLEMENTARY_SKILLS = [
    "Python", "Java", "JavaScript", "TypeScript", "Go", "Rust",
    "Swift", "Kotlin", "PHP", "Ruby", "Scala", "R", "C++", "C#",
    "SQL", "HTML", "CSS", "React", "Docker", "Kubernetes", "AWS",
    "Azure", "GCP", "Git", "Linux", "MongoDB", "PostgreSQL", "MySQL",
    ".NET", "Node.js", "Vue.js", "CI/CD", "REST API", "GraphQL"
]

# Baseline taxonomy import fallback
try:
    from skills_taxonomy import SKILLS_TAXONOMY
    COMBINED_SKILLS = set(SKILLS_TAXONOMY) | set(SUPPLEMENTARY_SKILLS)
except ImportError:
    COMBINED_SKILLS = set(SUPPLEMENTARY_SKILLS)


class SkillMatcherEngine:
    """Pre-compiles a single unified regex engine capable of matching standard word tokens
    and special-character skills (e.g. C++, C#, .NET) safely in single-pass O(M) time."""

    def __init__(self, skills: Set[str]):
        self.canonical_map = {}
        patterns = []

        # Sort longer skills first to prevent short prefix matching
        sorted_skills = sorted(skills, key=len, reverse=True)

        for skill in sorted_skills:
            clean_skill = skill.strip()
            if not clean_skill:
                continue
            
            lower_key = clean_skill.lower()
            self.canonical_map[lower_key] = clean_skill

            # Escape special regex characters
            escaped = re.escape(clean_skill)

            # Custom word boundary strategy: Standard \b fails on 'C++', 'C#', '.NET'
            # Use negative lookbehind/lookahead for alphanumeric boundaries
            pattern = rf"(?<![a-zA-Z0-9_]){escaped}(?![a-zA-Z0-9_])"
            patterns.append(pattern)

        # Single master pattern compiled once at engine initialization
        self.master_regex = re.compile(rf"({'|'.join(patterns)})", re.IGNORECASE)

    def extract(self, text: str) -> List[str]:
        if not text:
            return []
        
        matches = self.master_regex.findall(text)
        found_skills = set()

        for match in matches:
            matched_str = match.lower()
            if matched_str in self.canonical_map:
                found_skills.add(self.canonical_map[matched_str])

        return sorted(list(found_skills))


# Global singleton instance
SKILL_ENGINE = SkillMatcherEngine(COMBINED_SKILLS)


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extracts text from PDF with layout-aware spatial sorting."""
    text_parts = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            # layout=True maintains multi-column and tabular spatial relationship
            extracted = page.extract_text(layout=True, x_tolerance=2, y_tolerance=2)
            if extracted:
                text_parts.append(extracted)
    return "\n".join(text_parts)


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extracts text from DOCX traversing paragraphs AND table structures."""
    document = Document(io.BytesIO(file_bytes))
    text_parts = []

    # 1. Extract standard paragraphs
    for paragraph in document.paragraphs:
        if paragraph.text.strip():
            text_parts.append(paragraph.text.strip())

    # 2. Extract content buried in DOCX layout tables
    for table in document.tables:
        for row in table.rows:
            for cell in row.cells:
                for cell_paragraph in cell.paragraphs:
                    if cell_paragraph.text.strip():
                        text_parts.append(cell_paragraph.text.strip())

    return "\n".join(text_parts)


def extract_text(filename: str, file_bytes: bytes) -> str:
    """Validates file constraints and extracts raw text."""
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise ValueError(
            f"File size exceeds maximum threshold of {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB."
        )

    lower_filename = filename.lower()
    if lower_filename.endswith(".pdf"):
        text = extract_text_from_pdf(file_bytes)
    elif lower_filename.endswith(".docx"):
        text = extract_text_from_docx(file_bytes)
    else:
        raise ValueError("Unsupported file format. Please upload a PDF or DOCX resume.")

    cleaned_text = text.strip()
    if len(cleaned_text) < MIN_EXTRACTED_TEXT_CHARS:
        raise ValueError(
            "Couldn't extract readable text from this file — it may be a scanned/image-based "
            "PDF or corrupted document. Please provide a text-based PDF or DOCX file."
        )

    return cleaned_text


def parse_resume(filename: str, file_bytes: bytes) -> List[str]:
    """Parses binary resume document and extracts canonical taxonomy skills."""
    logger.info(f"Initiating resume parsing for file: {filename}")
    text = extract_text(filename, file_bytes)
    extracted_skills = SKILL_ENGINE.extract(text)
    logger.info(f"Resume parsing complete. Identified {len(extracted_skills)} skills.")
    return extracted_skills


if __name__ == "__main__":
    # Test suite verification
    sample_text = """
    JOHN DOE - SENIOR BACKEND ENGINEER
    Skills: C++, C#, .NET, Python, React.js, Docker, AWS.
    Experience in CI/CD pipeline automation and REST API development.
    """
    found = SKILL_ENGINE.extract(sample_text)
    print("Extracted Skills from Sample:")
    print(found)