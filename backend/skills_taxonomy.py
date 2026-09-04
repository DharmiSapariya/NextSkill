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


# Categorized Taxonomy with Alias Normalization.
#
# Categories mirror frontend/src/lib/skillCategories.js's SKILL_CATEGORIES —
# keep both in sync when adding a skill so it gets colored/grouped correctly
# in the UI instead of falling into the "Other" bucket.
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
    SkillDefinition("Ruby", "Languages"),
    SkillDefinition("PHP", "Languages"),
    SkillDefinition("Scala", "Languages"),
    SkillDefinition("Perl", "Languages"),
    SkillDefinition("MATLAB", "Languages"),
    SkillDefinition("Bash", "Languages", ("shell scripting", "shell script")),
    SkillDefinition("PowerShell", "Languages"),
    SkillDefinition("Dart", "Languages"),
    SkillDefinition("Haskell", "Languages"),
    SkillDefinition("Julia", "Languages"),
    SkillDefinition("Lua", "Languages"),
    SkillDefinition("COBOL", "Languages"),
    SkillDefinition("Elixir", "Languages"),
    SkillDefinition("Clojure", "Languages"),
    SkillDefinition("Groovy", "Languages"),
    SkillDefinition("VBA", "Languages"),
    SkillDefinition("Solidity", "Languages"),

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
    SkillDefinition("HTML", "Frameworks", ("html5",)),
    SkillDefinition("CSS", "Frameworks", ("css3",)),
    SkillDefinition("Svelte", "Frameworks", ("sveltejs",)),
    SkillDefinition("Nuxt.js", "Frameworks", ("nuxtjs", "nuxt")),
    SkillDefinition("Ruby on Rails", "Frameworks", ("rails",)),
    SkillDefinition("Laravel", "Frameworks"),
    SkillDefinition("ASP.NET Core", "Frameworks", ("asp.net", "dotnet core", ".net core")),
    SkillDefinition("NestJS", "Frameworks"),
    SkillDefinition("jQuery", "Frameworks"),
    SkillDefinition("Redux", "Frameworks"),
    SkillDefinition("Bootstrap", "Frameworks"),
    SkillDefinition("Material UI", "Frameworks", ("mui",)),
    SkillDefinition("Chakra UI", "Frameworks"),
    SkillDefinition("Gatsby", "Frameworks"),
    SkillDefinition("Remix", "Frameworks"),
    SkillDefinition("Symfony", "Frameworks"),
    SkillDefinition("Hibernate", "Frameworks"),
    SkillDefinition("Webpack", "Frameworks"),
    SkillDefinition("Vite", "Frameworks"),
    SkillDefinition("Sass", "Frameworks", ("scss",)),

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
    SkillDefinition("MLOps", "Data & ML"),
    SkillDefinition("LLMs", "Data & ML", ("large language models", "llm")),
    SkillDefinition("Prompt Engineering", "Data & ML"),
    SkillDefinition("Vector Databases", "Data & ML", ("vector db", "vector database")),
    SkillDefinition("Airflow", "Data & ML", ("apache airflow",)),
    SkillDefinition("Spark", "Data & ML", ("apache spark", "pyspark")),
    SkillDefinition("Kafka", "Data & ML", ("apache kafka",)),
    SkillDefinition("Keras", "Data & ML"),
    SkillDefinition("XGBoost", "Data & ML"),
    SkillDefinition("LightGBM", "Data & ML"),
    SkillDefinition("Hugging Face Transformers", "Data & ML", ("hugging face", "transformers")),
    SkillDefinition("LangChain", "Data & ML"),
    SkillDefinition("OpenCV", "Data & ML"),
    SkillDefinition("Statistics", "Data & ML"),
    SkillDefinition("Feature Engineering", "Data & ML"),
    SkillDefinition("MLflow", "Data & ML"),
    SkillDefinition("Ray", "Data & ML"),
    SkillDefinition("Hadoop", "Data & ML", ("apache hadoop",)),
    SkillDefinition("Hive", "Data & ML", ("apache hive",)),
    SkillDefinition("dbt", "Data & ML"),
    SkillDefinition("Snowflake", "Data & ML"),
    SkillDefinition("BigQuery", "Data & ML", ("google bigquery",)),
    SkillDefinition("Redshift", "Data & ML", ("amazon redshift",)),
    SkillDefinition("Databricks", "Data & ML"),
    SkillDefinition("Tableau", "Data & ML"),
    SkillDefinition("Power BI", "Data & ML", ("powerbi",)),
    SkillDefinition("Excel", "Data & ML", ("microsoft excel",)),
    SkillDefinition("Looker", "Data & ML"),
    SkillDefinition("Qlik", "Data & ML", ("qlikview", "qliksense")),
    SkillDefinition("Alteryx", "Data & ML"),

    # Databases
    SkillDefinition("PostgreSQL", "Databases", ("postgres", "postgresql")),
    SkillDefinition("MySQL", "Databases", ("my-sql",)),
    SkillDefinition("MongoDB", "Databases", ("mongo", "mongo-db")),
    SkillDefinition("Redis", "Databases"),
    SkillDefinition("Elasticsearch", "Databases", ("elastic-search", "elastic")),
    SkillDefinition("SQLite", "Databases"),
    SkillDefinition("Cassandra", "Databases", ("apache cassandra",)),
    SkillDefinition("DynamoDB", "Databases", ("amazon dynamodb",)),
    SkillDefinition("Neo4j", "Databases"),
    SkillDefinition("MariaDB", "Databases"),
    SkillDefinition("Oracle Database", "Databases", ("oracle db", "oracle sql")),
    SkillDefinition("SQL Server", "Databases", ("microsoft sql server", "mssql")),
    SkillDefinition("CockroachDB", "Databases"),
    SkillDefinition("InfluxDB", "Databases"),
    SkillDefinition("Firebase", "Databases"),
    SkillDefinition("Supabase", "Databases"),
    SkillDefinition("ClickHouse", "Databases"),

    # Cloud & DevOps
    SkillDefinition("AWS", "Cloud & DevOps", ("amazon web services", "amazon aws")),
    SkillDefinition("Azure", "Cloud & DevOps", ("microsoft azure",)),
    SkillDefinition("GCP", "Cloud & DevOps", ("google cloud", "google cloud platform")),
    SkillDefinition("Docker", "Cloud & DevOps", ("containerization", "docker-compose")),
    SkillDefinition("Kubernetes", "Cloud & DevOps", ("k8s", "k8")),
    SkillDefinition("CI/CD", "Cloud & DevOps", ("ci/cd pipeline", "continuous integration")),
    SkillDefinition("Terraform", "Cloud & DevOps"),
    SkillDefinition("Jenkins", "Cloud & DevOps"),
    SkillDefinition("Ansible", "Cloud & DevOps"),
    SkillDefinition("Cloud Security", "Cloud & DevOps"),
    SkillDefinition("Prometheus", "Cloud & DevOps"),
    SkillDefinition("Grafana", "Cloud & DevOps"),
    SkillDefinition("Incident Response", "Cloud & DevOps"),
    SkillDefinition("Helm", "Cloud & DevOps"),
    SkillDefinition("ArgoCD", "Cloud & DevOps", ("argo cd",)),
    SkillDefinition("GitLab CI", "Cloud & DevOps", ("gitlab-ci",)),
    SkillDefinition("GitHub Actions", "Cloud & DevOps"),
    SkillDefinition("CircleCI", "Cloud & DevOps", ("circle ci",)),
    SkillDefinition("Chef", "Cloud & DevOps"),
    SkillDefinition("Puppet", "Cloud & DevOps"),
    SkillDefinition("Datadog", "Cloud & DevOps"),
    SkillDefinition("New Relic", "Cloud & DevOps"),
    SkillDefinition("Splunk", "Cloud & DevOps"),
    SkillDefinition("ELK Stack", "Cloud & DevOps", ("elk", "elastic stack")),
    SkillDefinition("Nagios", "Cloud & DevOps"),
    SkillDefinition("Vagrant", "Cloud & DevOps"),
    SkillDefinition("Pulumi", "Cloud & DevOps"),
    SkillDefinition("OpenShift", "Cloud & DevOps"),
    SkillDefinition("Nginx", "Cloud & DevOps"),
    SkillDefinition("Serverless", "Cloud & DevOps", ("serverless framework",)),
    SkillDefinition("AWS Lambda", "Cloud & DevOps", ("lambda",)),
    SkillDefinition("Cloudflare", "Cloud & DevOps"),
    SkillDefinition("Load Balancing", "Cloud & DevOps"),
    SkillDefinition("DigitalOcean", "Cloud & DevOps"),
    SkillDefinition("Heroku", "Cloud & DevOps"),
    SkillDefinition("Vercel", "Cloud & DevOps"),
    SkillDefinition("Netlify", "Cloud & DevOps"),

    # Tools & Methodologies
    SkillDefinition("Git", "Tools & Methodologies", ("github", "gitlab", "version control")),
    SkillDefinition("Linux", "Tools & Methodologies", ("unix", "ubuntu", "centos")),
    SkillDefinition("REST API", "Tools & Methodologies", ("restful", "rest apis", "rest")),
    SkillDefinition("GraphQL", "Tools & Methodologies"),
    SkillDefinition("Microservices", "Tools & Methodologies", ("microservice architecture",)),
    SkillDefinition("Agile", "Tools & Methodologies", ("agile methodology",)),
    SkillDefinition("Scrum", "Tools & Methodologies", ("scrum master",)),
    SkillDefinition("Jira", "Tools & Methodologies"),
    SkillDefinition("A/B Testing", "Tools & Methodologies", ("ab testing",)),
    SkillDefinition("Product Strategy", "Tools & Methodologies"),
    SkillDefinition("Roadmapping", "Tools & Methodologies", ("product roadmapping",)),
    SkillDefinition("Stakeholder Management", "Tools & Methodologies"),
    SkillDefinition("Kanban", "Tools & Methodologies"),
    SkillDefinition("Confluence", "Tools & Methodologies"),
    SkillDefinition("Trello", "Tools & Methodologies"),
    SkillDefinition("Asana", "Tools & Methodologies"),
    SkillDefinition("Notion", "Tools & Methodologies"),
    SkillDefinition("gRPC", "Tools & Methodologies"),
    SkillDefinition("RabbitMQ", "Tools & Methodologies"),
    SkillDefinition("Event-Driven Architecture", "Tools & Methodologies"),
    SkillDefinition("Domain-Driven Design", "Tools & Methodologies", ("ddd",)),
    SkillDefinition("TDD", "Tools & Methodologies", ("test-driven development",)),
    SkillDefinition("BDD", "Tools & Methodologies", ("behavior-driven development",)),
    SkillDefinition("Pair Programming", "Tools & Methodologies"),
    SkillDefinition("Code Review", "Tools & Methodologies"),
    SkillDefinition("System Design", "Tools & Methodologies"),
    SkillDefinition("OOP", "Tools & Methodologies", ("object-oriented programming",)),
    SkillDefinition("Design Patterns", "Tools & Methodologies"),
    SkillDefinition("Product Analytics", "Tools & Methodologies"),
    SkillDefinition("User Stories", "Tools & Methodologies"),
    SkillDefinition("OKRs", "Tools & Methodologies", ("objectives and key results",)),
    SkillDefinition("Competitive Analysis", "Tools & Methodologies"),

    # Mobile & QA
    SkillDefinition("Swift", "Mobile & QA"),
    SkillDefinition("SwiftUI", "Mobile & QA"),
    SkillDefinition("Xcode", "Mobile & QA"),
    SkillDefinition("Kotlin", "Mobile & QA"),
    SkillDefinition("Android SDK", "Mobile & QA"),
    SkillDefinition("Jetpack Compose", "Mobile & QA"),
    SkillDefinition("React Native", "Mobile & QA"),
    SkillDefinition("Flutter", "Mobile & QA"),
    SkillDefinition("Objective-C", "Mobile & QA"),
    SkillDefinition("Appium", "Mobile & QA"),
    SkillDefinition("JUnit", "Mobile & QA"),
    SkillDefinition("Postman", "Mobile & QA"),
    SkillDefinition("API Testing", "Mobile & QA"),
    SkillDefinition("Performance Testing", "Mobile & QA"),
    SkillDefinition("Load Testing", "Mobile & QA"),
    SkillDefinition("Playwright", "Mobile & QA"),
    SkillDefinition("Espresso", "Mobile & QA"),
    SkillDefinition("XCTest", "Mobile & QA"),
    SkillDefinition("Selenium", "Mobile & QA"),
    SkillDefinition("Cypress", "Mobile & QA"),
    SkillDefinition("Manual Testing", "Mobile & QA"),
    SkillDefinition("Test Planning", "Mobile & QA"),
    SkillDefinition("App Store Deployment", "Mobile & QA"),
    SkillDefinition("Google Play Console", "Mobile & QA"),

    # Security & Data Ops
    SkillDefinition("SIEM", "Security & Data Ops"),
    SkillDefinition("Penetration Testing", "Security & Data Ops", ("pentesting",)),
    SkillDefinition("SOC 2", "Security & Data Ops"),
    SkillDefinition("Network Security", "Security & Data Ops"),
    SkillDefinition("Backup & Recovery", "Security & Data Ops"),
    SkillDefinition("Database Tuning", "Security & Data Ops"),
    SkillDefinition("OAuth", "Security & Data Ops", ("oauth2",)),
    SkillDefinition("JWT", "Security & Data Ops"),
    SkillDefinition("SSO", "Security & Data Ops", ("single sign-on",)),
    SkillDefinition("Identity and Access Management", "Security & Data Ops", ("iam",)),
    SkillDefinition("Vulnerability Assessment", "Security & Data Ops"),
    SkillDefinition("Threat Modeling", "Security & Data Ops"),
    SkillDefinition("Firewall Configuration", "Security & Data Ops"),
    SkillDefinition("Zero Trust Architecture", "Security & Data Ops"),
    SkillDefinition("Encryption", "Security & Data Ops"),
    SkillDefinition("GDPR Compliance", "Security & Data Ops", ("gdpr",)),
    SkillDefinition("ISO 27001", "Security & Data Ops"),
    SkillDefinition("Malware Analysis", "Security & Data Ops"),
    SkillDefinition("DevSecOps", "Security & Data Ops"),
    SkillDefinition("Data Governance", "Security & Data Ops"),
    SkillDefinition("Data Warehousing", "Security & Data Ops"),
    SkillDefinition("ETL", "Security & Data Ops", ("extract transform load",)),
    SkillDefinition("Database Replication", "Security & Data Ops"),
    SkillDefinition("Query Optimization", "Security & Data Ops"),

    # Design
    SkillDefinition("Figma", "Design"),
    SkillDefinition("Wireframing", "Design"),
    SkillDefinition("User Research", "Design"),
    SkillDefinition("Prototyping", "Design"),
    SkillDefinition("Design Systems", "Design"),
    SkillDefinition("Sketch", "Design"),
    SkillDefinition("Usability Testing", "Design"),
    SkillDefinition("Adobe XD", "Design"),
    SkillDefinition("Photoshop", "Design", ("adobe photoshop",)),
    SkillDefinition("Illustrator", "Design", ("adobe illustrator",)),
    SkillDefinition("InVision", "Design"),
    SkillDefinition("Interaction Design", "Design"),
    SkillDefinition("Information Architecture", "Design"),
    SkillDefinition("Accessibility", "Design", ("wcag", "a11y")),
    SkillDefinition("Design Thinking", "Design"),
    SkillDefinition("User Personas", "Design"),
    SkillDefinition("Journey Mapping", "Design"),
    SkillDefinition("Visual Design", "Design"),
    SkillDefinition("Motion Design", "Design"),
    SkillDefinition("Typography", "Design"),
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
