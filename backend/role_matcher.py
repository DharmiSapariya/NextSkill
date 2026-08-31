import logging
import threading
from functools import lru_cache
from typing import Any, Dict, Optional, Tuple
import anyio

from role_graph import TRACKED_ROLES

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nextskill.ai.role_resolver")

# Extended domain-specific acronyms and aliases
ROLE_ALIASES: Dict[str, str] = {
    # Acronyms
    "sre": "site reliability engineer",
    "qa": "qa engineer",
    "qa tester": "qa engineer",
    "sdet": "test automation engineer",
    "dba": "database administrator",
    "ml engineer": "machine learning engineer",
    "mle": "machine learning engineer",
    "ai engineer": "ai engineer",
    "swe": "software engineer",
    "devops": "devops engineer",
    "pm": "product manager",
    "ux designer": "ui ux designer",
    "ui designer": "ui ux designer",
    # Frameworks & Stacks
    "react developer": "frontend developer",
    "angular developer": "frontend developer",
    "vue developer": "frontend developer",
    "node developer": "backend developer",
    "python developer": "backend developer",
    "java developer": "backend developer",
    "django developer": "backend developer",
    "flutter developer": "mobile developer",
    "react native developer": "mobile developer",
}

SIMILARITY_THRESHOLD = 0.60

class SemanticRoleMatcher:
    """Thread-safe, cached semantic role resolution engine using SentenceTransformers."""

    _instance: Optional["SemanticRoleMatcher"] = None
    _lock: threading.Lock = threading.Lock()

    def __init__(self) -> None:
        self.model = None
        self.role_embeddings = None
        self.load_failed = False
        self._init_lock = threading.Lock()

    @classmethod
    def get_instance(cls) -> "SemanticRoleMatcher":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def _ensure_model_loaded(self) -> None:
        """Thread-safe double-checked initialization of the embedding model."""
        if self.model is not None or self.load_failed:
            return

        with self._init_lock:
            if self.model is not None or self.load_failed:
                return

            try:
                logger.info("Initializing SentenceTransformer 'all-MiniLM-L6-v2'...")
                from sentence_transformers import SentenceTransformer

                self.model = SentenceTransformer("all-MiniLM-L6-v2")
                self.role_embeddings = self.model.encode(
                    TRACKED_ROLES, normalize_embeddings=True
                )
                logger.info("SentenceTransformer model loaded successfully.")
            except Exception as exc:
                logger.error(
                    f"Failed to load sentence-transformers model: {str(exc)}. "
                    "Engine failing open to string matching."
                )
                self.load_failed = True

    def resolve(self, query: str) -> Dict[str, Any]:
        """Synchronously resolves free-text query to nearest canonical tracked role."""
        if not query or not query.strip():
            return {"resolved": "", "matched_semantically": False, "similarity": None}

        query_clean = query.strip().lower()

        # 1. Direct hit on tracked roles
        if query_clean in TRACKED_ROLES:
            return {
                "resolved": query_clean,
                "matched_semantically": False,
                "similarity": 1.0,
            }

        # 2. Fast lookup via alias dictionary
        if query_clean in ROLE_ALIASES:
            return {
                "resolved": ROLE_ALIASES[query_clean],
                "matched_semantically": True,
                "similarity": 1.0,
            }

        # 3. Model lazy load check
        self._ensure_model_loaded()
        if self.model is None or self.role_embeddings is None:
            return {
                "resolved": query_clean,
                "matched_semantically": False,
                "similarity": None,
            }

        # 4. Vector similarity evaluation
        from sentence_transformers import util

        query_embedding = self.model.encode([query_clean], normalize_embeddings=True)
        scores = util.cos_sim(query_embedding, self.role_embeddings)[0]
        best_idx = int(scores.argmax())
        best_score = float(scores[best_idx])

        if best_score >= SIMILARITY_THRESHOLD:
            return {
                "resolved": TRACKED_ROLES[best_idx],
                "matched_semantically": True,
                "similarity": round(best_score, 3),
            }

        return {
            "resolved": query_clean,
            "matched_semantically": False,
            "similarity": round(best_score, 3),
        }


# Global LRU cache layer over matcher execution
@lru_cache(maxsize=1024)
def resolve_role(query: str) -> Dict[str, Any]:
    """LRU-cached resolver wrapper to prevent repeated inference on identical queries."""
    matcher = SemanticRoleMatcher.get_instance()
    return matcher.resolve(query)


async def resolve_role_async(query: str) -> Dict[str, Any]:
    """Async wrapper offloading CPU matrix math off the main asyncio event loop."""
    return await anyio.to_thread.run_sync(resolve_role, query)


if __name__ == "__main__":
    # Test suite validation
    test_queries = [
        "software engineer",  # Direct match
        "SRE",                # Alias lookup
        "React Developer",    # Alias lookup
        "ML Engineer",        # Alias lookup
        "PyTorch Specialist", # Semantic embedding resolution
        "Growth Marketing",   # Below threshold fallback
    ]

    print("\n--- Role Resolution Results ---")
    for q in test_queries:
        res = resolve_role(q)
        print(f"Query: '{q:20s}' -> Resolved: '{res['resolved']:25s}' "
              f"| Semantic: {str(res['matched_semantically']):5s} | Score: {res['similarity']}")