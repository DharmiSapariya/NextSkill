"""Infers a posting's seniority level from its title — a title-keyword
heuristic, not true seniority extraction. Years-of-experience parsing from
the full description would be more accurate but is a much larger NLP
problem than this project's other regex-based skill extraction; numeral
suffixes like "Engineer II" aren't detected either, only explicit words.

Most real postings don't state seniority in the title at all, which is
exactly why "unspecified" exists as a fourth, honest option rather than
guessing.

SENIORITY_PATTERNS is also used directly as a Postgres regex filter
(Job.title.op("~*")(pattern)) by /jobs's ?seniority= query param in api.py —
one definition, not two that could silently drift apart from each other.
"""
import re

SENIORITY_LEVELS = ("junior", "mid", "senior", "unspecified")

SENIORITY_PATTERNS = {
    "senior": r"\b(senior|sr\.?|staff|principal|lead|architect)\b",
    "junior": r"\b(junior|jr\.?|entry.?level|associate|intern)\b",
    "mid": r"\bmid.?level\b",
}


def infer_seniority(title: str) -> str:
    for level, pattern in SENIORITY_PATTERNS.items():
        if re.search(pattern, title, re.IGNORECASE):
            return level
    return "unspecified"


def as_postgres_regex(pattern: str) -> str:
    """Postgres's regex engine (POSIX ARE) uses \\y for a word boundary, not
    \\b — \\b there means a literal backspace character instead, so a Python
    \\b pattern silently matches nothing rather than erroring. Confirmed
    directly against a real Postgres instance: `title ~* '\\b(senior...)\\b'`
    returned zero rows against a title actually containing "Senior", while
    `~* '\\y(senior...)\\y'` correctly matched it. This is the one place
    SENIORITY_PATTERNS needs translating for use as a Job.title.op("~*")(...)
    filter — everywhere else (infer_seniority, via Python's re) uses \\b
    as-is."""
    return pattern.replace(r"\b", r"\y")
