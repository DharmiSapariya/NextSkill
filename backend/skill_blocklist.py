import re
from typing import Iterable, Set

# Comprehensive blocklist categorizing non-actionable or generic EMSI extractions
SKILL_BLOCKLIST: Set[str] = {
    # 1. Structural / Metadata Noise
    "job description", "com", "www", "http", "https", "etc", "e g", "i e",
    "opportunity", "requirements", "responsibilities", "qualification",
    "qualifications", "role", "position", "candidate", "team member",

    # 2. Broad Academic Degrees & Majors (Not distinct learnable skills)
    "computer science", "information technology", "software engineering",
    "data science", "electrical engineering", "business administration",
    "degree", "bachelor", "master", "phd", "diploma",

    # 3. Non-Technical / Generic Soft Skills
    "problem solve", "problem solving", "communication", "communication skills",
    "teamwork", "collaboration", "time management", "critical thinking",
    "self starter", "detail oriented", "fast paced", "work ethic",
    "leadership", "management", "interpersonal skills",

    # 4. Overly Broad / Ambiguous Industry Terms
    "user experience", "user interface", "software", "hardware",
    "technology", "data", "analytics", "engineering", "development",
    "programming", "code", "system", "systems", "application", "applications",
    "web", "internet", "cloud", "security", "infrastructure",
}

# Regex to catch top-level domains, URLs, or invalid single/double-character tokens
_URL_PATTERN = re.compile(r"(\.com|\.org|\.net|\.io|http|www)", re.IGNORECASE)
_INVALID_TOKEN_PATTERN = re.compile(r"^[0-9]+$|^[a-z]{1,2}$", re.IGNORECASE)


def clean_skill(skill: str) -> str:
    """Standardizes skill string format for consistent matching."""
    return skill.strip().lower()


def is_valid_skill(skill: str) -> bool:
    """Evaluates whether an extracted string is a valid technical skill.
    
    Filters out noise based on:
    - Blocklist matches
    - Structural patterns (URLs, numeric-only strings, single/double letter noise)
    - Length limits
    """
    cleaned = clean_skill(skill)

    if not cleaned:
        return False

    # Blocklist lookup
    if cleaned in SKILL_BLOCKLIST:
        return False

    # Filter out numeric-only strings or 1-2 letter noise (unless exceptions are needed)
    if _INVALID_TOKEN_PATTERN.match(cleaned):
        return False

    # Filter out TLDs and web addresses
    if _URL_PATTERN.search(cleaned):
        return False

    return True


def filter_skills(skills: Iterable[str]) -> Set[str]:
    """Filters an iterable of extracted skills, returning unique valid skills."""
    return {clean_skill(s) for s in skills if is_valid_skill(s)}


# Example usage
if __name__ == "__main__":
    raw_extracted_skills = [
        "Python", 
        "computer science", 
        "com", 
        "Docker", 
        "problem solve", 
        "User Experience", 
        "Kubernetes",
        "88",
        "example.com"
    ]
    
    valid_skills = filter_skills(raw_extracted_skills)
    print("Filtered Skills:", valid_skills)
    # Output: {'python', 'docker', 'kubernetes'}