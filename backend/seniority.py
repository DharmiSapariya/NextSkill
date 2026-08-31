"""Seniority classification and database regex abstraction module.

Provides title-keyword and numeral-suffix classification for job postings 
along with dialect-aware SQLAlchemy filter creation for PostgreSQL and SQLite.
"""

import re
from functools import lru_cache
from typing import Any, Dict, Tuple
from sqlalchemy import or_
from sqlalchemy.orm import Query

SENIORITY_LEVELS: Tuple[str, ...] = ("junior", "mid", "senior", "unspecified")

# Ordered priority mapping (Highest specificity first)
SENIORITY_PATTERNS: Dict[str, str] = {
    "senior": (
        r"(?i)\b("
        r"senior|sr\.?|principal|lead|architect|"
        r"staff(?!\s*ing)|"  # Matches 'Staff Engineer' but avoids 'Staffing Coordinator'
        r"head\s+of|vp|director|"
        r"engineer\s+(iii|iv|v|[3-5])|developer\s+(iii|iv|v|[3-5])"
        r")\b"
    ),
    "mid": (
        r"(?i)\b("
        r"mid.?level|intermediate|"
        r"engineer\s+(ii|[2])|developer\s+(ii|[2])"
        r")\b"
    ),
    "junior": (
        r"(?i)\b("
        r"junior|jr\.?|entry.?level|internship|intern|"
        r"associate\s+(engineer|developer|analyst)|" # Avoids broad 'Operations Associate'
        r"engineer\s+(i|[1])|developer\s+(i|[1])"
        r")\b"
    ),
}

# Pre-compiled Python regex patterns for O(1) inference speed
_COMPILED_PATTERNS = {
    level: re.compile(pattern) for level, pattern in SENIORITY_PATTERNS.items()
}


@lru_cache(maxsize=2048)
def infer_seniority(title: str) -> str:
    """Infers seniority level from job title string using pre-compiled heuristics.

    Args:
        title: Raw or cleaned job title string.

    Returns:
        One of ("junior", "mid", "senior", "unspecified").
    """
    if not title or not title.strip():
        return "unspecified"

    clean_title = title.strip()

    # Priority order matching: Senior -> Mid -> Junior -> Unspecified
    for level in ("senior", "mid", "junior"):
        if _COMPILED_PATTERNS[level].search(clean_title):
            return level

    return "unspecified"


def as_postgres_regex(pattern: str) -> str:
    """Translates Python regex standard word boundaries (\\b) to POSIX ARE (\\y).

    Postgres POSIX ARE regex uses \\y for word boundaries, whereas \\b represents
    a backspace character. 
    """
    # Remove Inline Python flag (?i) as Postgres ~* handles case insensitivity natively
    clean_pattern = re.sub(r"^\(\?i\)", "", pattern)
    return clean_pattern.replace(r"\b", r"\y")


def apply_seniority_filter(query: Query, model_column: Any, level: str) -> Query:
    """Applies dialect-aware seniority filtering to SQLAlchemy queries.

    Handles POSIX ARE regex for PostgreSQL and ILIKE fallback patterns for 
    SQLite/other dialects.
    """
    level_clean = level.lower().strip()
    if level_clean not in SENIORITY_PATTERNS:
        if level_clean == "unspecified":
            # Exclude matches from all explicit categories
            negated_filters = []
            for lvl, pat in SENIORITY_PATTERNS.items():
                pg_pat = as_postgres_regex(pat)
                negated_filters.append(~model_column.op("~*")(pg_pat))
            return query.filter(*negated_filters)
        return query

    raw_pattern = SENIORITY_PATTERNS[level_clean]
    
    # Inspection check for Postgres execution vs SQLite fallback
    try:
        bind = query.session.get_bind()
        dialect_name = bind.dialect.name if bind else "postgresql"
    except Exception:
        dialect_name = "postgresql"

    if dialect_name == "postgresql":
        pg_pattern = as_postgres_regex(raw_pattern)
        return query.filter(model_column.op("~*")(pg_pattern))
    else:
        # Generic fallback for SQLite / testing engines using ILIKE
        # Evaluates using basic substring keywords
        if level_clean == "senior":
            keywords = ["senior", "sr", "lead", "principal", "staff", "architect"]
        elif level_clean == "mid":
            keywords = ["mid", "intermediate"]
        else:
            keywords = ["junior", "jr", "entry", "intern", "associate"]

        ilike_filters = [model_column.ilike(f"%{kw}%") for kw in keywords]
        return query.filter(or_(*ilike_filters))


if __name__ == "__main__":
    # Test suite validation
    test_titles = [
        "Senior Software Engineer",
        "Sr. Backend Developer",
        "Staff Software Engineer",
        "Staffing Coordinator",  # Should be unspecified
        "Software Engineer II",  # Mid-level
        "Junior Data Analyst",
        "Associate Professor",   # Unspecified
        "Associate Engineer",    # Junior
        "Lead Solutions Architect",
        "Unspecified Role Title",
    ]

    print("\n--- Seniority Inference Test Output ---")
    for t in test_titles:
        result = infer_seniority(t)
        print(f"Title: '{t:30s}' -> Seniority: {result}")