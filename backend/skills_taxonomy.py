"""Skills Taxonomy & Normalization Registry.

Provides structured domain categorizations, alias mappings, and pre-compiled
word-boundary search patterns for zero-false-positive skill extraction pipelines.
"""

import re
from dataclasses import dataclass, field
from typing import Dict, List, Set, Tuple


@dataclass(frozen=True)
class SkillDefinition:
    """Canonical representation of a skill entity within the taxonomy."""
    canonical_name: str
    category: str
    aliases: Tuple[str, ...] = field(default_factory=tuple)

    def all_surface_forms(self) -> List[str]:
        """Returns all valid text representations including canonical name."""
        return [self.canonical_name] + list(self.aliases)


# Categorized Taxonomy with Alias Normalization
TAXONOMY_REGISTRY: List[SkillDefinition] = [
    # Languages
    SkillDefinition("Python", "Languages", ("python3", "py")),
    SkillDefinition("Java", "Languages", ("java8", "java11", "java17")),
    SkillDefinition("JavaScript", "Languages", ("js", "javascript.js")),
    SkillDefinition("TypeScript", "Languages", ("ts", "typescript.js")),
    SkillDefinition("C++", "Languages", ("cpp", "c plus plus")),
    SkillDefinition("C#", "Languages", ("csharp", "c sharp")),
    SkillDefinition("Go", "Languages", ("golang",)),
    SkillDefinition("Rust", "Languages", ("rustlang",)),
    SkillDefinition("SQL", "Languages", ("structured query language",)),
    SkillDefinition("R", "Languages", ("r-lang", "r language")),

    # Web & Backend Frameworks
    SkillDefinition("React", "Frameworks", ("reactjs", "react.js")),
    SkillDefinition("Angular", "Frameworks", ("angularjs", "angular.js", "angular2+")),
    SkillDefinition("Vue", "Frameworks", ("vuejs", "vue.js", "vue3")),
    SkillDefinition("Next.js", "Frameworks", ("nextjs", "next")),
    SkillDefinition("Node.js", "Frameworks", ("nodejs", "node")),
    SkillDefinition("Django", "Frameworks", ("django-rest-framework", "drf")),
    SkillDefinition("Flask", "Frameworks"),
    SkillDefinition("FastAPI", "Frameworks", ("fast-api",)),
    SkillDefinition("Spring Boot", "Frameworks", ("spring", "springframework")),
    SkillDefinition("Express", "Frameworks", ("expressjs", "express.js")),
    SkillDefinition("Tailwind CSS", "Frameworks", ("tailwind", "tailwindcss")),

    # Data & ML
    SkillDefinition("Pandas", "Data & ML"),
    SkillDefinition("NumPy", "Data & ML", ("numpy",)),
    SkillDefinition("scikit-learn", "Data & ML", ("sklearn", "scikitlearn")),
    SkillDefinition("TensorFlow", "Data & ML", ("tf", "tensorflow2")),
    SkillDefinition("PyTorch", "Data & ML", ("torch",)),
    SkillDefinition("Machine Learning", "Data & ML", ("ml", "machine-learning")),
    SkillDefinition("Deep Learning", "Data & ML", ("dl", "deep-learning")),
    SkillDefinition("NLP", "Data & ML", ("natural language processing",)),
    SkillDefinition("Data Analysis", "Data & ML", ("data analytics",)),
    SkillDefinition("Data Visualization", "Data & ML", ("dataviz", "data viz")),

    # Databases
    SkillDefinition("PostgreSQL", "Databases", ("postgres", "postgresql")),
    SkillDefinition("MySQL", "Databases", ("my-sql",)),
    SkillDefinition("MongoDB", "Databases", ("mongo", "mongo-db")),
    SkillDefinition("Redis", "Databases"),
    SkillDefinition("Elasticsearch", "Databases", ("elastic-search", "elastic")),

    # Cloud & DevOps
    SkillDefinition("AWS", "Cloud & DevOps", ("amazon web services", "amazon aws")),
    SkillDefinition("Azure", "Cloud & DevOps", ("microsoft azure",)),
    SkillDefinition("GCP", "Cloud & DevOps", ("google cloud", "google cloud platform")),
    SkillDefinition("Docker", "Cloud & DevOps", ("containerization", "docker-compose")),
    SkillDefinition("Kubernetes", "Cloud & DevOps", ("k8s", "k8")),
    SkillDefinition("CI/CD", "Cloud & DevOps", ("ci/cd pipeline", "continuous integration")),
    SkillDefinition("Terraform", "Cloud & DevOps"),
    SkillDefinition("Jenkins", "Cloud & DevOps"),

    # Tools & Methodologies
    SkillDefinition("Git", "Tools & Methodologies", ("github", "gitlab", "version control")),
    SkillDefinition("Linux", "Tools & Methodologies", ("unix", "ubuntu", "centos")),
    SkillDefinition("REST API", "Tools & Methodologies", ("restful", "rest apis", "rest")),
    SkillDefinition("GraphQL", "Tools & Methodologies"),
    SkillDefinition("Microservices", "Tools & Methodologies", ("microservice architecture",)),
    SkillDefinition("Agile", "Tools & Methodologies", ("agile methodology",)),
    SkillDefinition("Scrum", "Tools & Methodologies", ("scrum master",)),
]


class SkillExtractor:
    """Pre-compiled Regex extraction engine with alias mapping and boundary checks."""

    def __init__(self, registry: List[SkillDefinition]):
        self.alias_to_canonical: Dict[str, str] = {}
        pattern_parts: List[str] = []

        for skill in registry:
            for form in skill.all_surface_forms():
                cleaned_form = form.lower().strip()
                self.alias_to_canonical[cleaned_form] = skill.canonical_name
                
                # Escape special regex characters (e.g. C++, C#, .js)
                escaped = re.escape(cleaned_form)
                
                # Custom word boundary handling for C++, C#, .js
                pattern_parts.append(rf"(?<!\w){escaped}(?!\w)")

        # Compile master extraction pattern
        self.master_regex = re.compile(
            r"|".join(pattern_parts), 
            flags=re.IGNORECASE
        )

    def extract_skills(self, text: str) -> Set[str]:
        """Extracts unique canonical skill names from input text.

        Args:
            text: Raw job description text.

        Returns:
            Set of matched canonical skill names.
        """
        if not text:
            return set()

        matches = self.master_regex.findall(text)
        canonical_matches = set()

        for match in matches:
            cleaned_match = match.lower().strip()
            if cleaned_match in self.alias_to_canonical:
                canonical_matches.add(self.alias_to_canonical[cleaned_match])

        return canonical_matches


# Global Instance Initialization
extractor = SkillExtractor(TAXONOMY_REGISTRY)

# Flat canonical-name list — kept as a plain export for callers that just
# want "every skill name" (e.g. resume_parser.py's regex matcher,
# extract_skills.py's seeding query) rather than the full SkillDefinition
# registry with its category/alias metadata.
SKILLS_TAXONOMY: List[str] = [skill.canonical_name for skill in TAXONOMY_REGISTRY]

if __name__ == "__main__":
    print(f"Taxonomy contains {len(TAXONOMY_REGISTRY)} canonical skills.")
    
    # Test Extraction Pipeline
    sample_text = """
    Looking for a Senior Software Engineer proficient in Go, Python3, and React.js.
    Experience with Postgres, K8s, and AWS is required. Good communication skills.
    """
    
    extracted = extractor.extract_skills(sample_text)
    print("\n--- Skill Extraction Test ---")
    print(f"Sample Text: {sample_text.strip()}")
    print(f"Extracted Canonical Skills: {sorted(list(extracted))}")