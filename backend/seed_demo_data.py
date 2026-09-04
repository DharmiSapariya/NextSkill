"""Large, realistic-feeling fixture seeder for local/demo use.

seed_test_data.py is a small deterministic fixture that test_skill_graph.py
and friends assert exact values against — it must stay untouched. This is a
separate script for actually trying the product locally: every tracked role,
a roster of well-known companies, thousands of postings per role drawn from
the full skills_taxonomy.py breadth (250+ skills), varied seniority and
location, and posting dates spread across a full year so /trends has several
real windows to compare.

Company names are recognizable real employers, used purely as realistic
local fixture data — nothing here is scraped or claims to be a genuine
posting from that company.

Usage:
    python3 seed_demo_data.py            # skip if jobs already exist
    python3 seed_demo_data.py --reset    # wipe and reseed from scratch
"""

import logging
import random
import sys
from datetime import date, timedelta
from typing import Dict, List, Tuple

from models import Base, Company, Job, JobSkill, SessionLocal, Skill, engine
from role_graph import TRACKED_ROLES
from skills_taxonomy import SKILLS_TAXONOMY

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nextskill.seed.demo")

RNG_SEED = 20260101
POSTINGS_PER_ROLE = (1400, 2400)  # random range, so roles don't all look identical
POSTING_WINDOW_DAYS = 365  # a full year — several /trends 30-day comparison windows with room to spare

COMPANIES: List[str] = [
    # Big tech / consumer internet
    "Google", "Microsoft", "Amazon", "Apple", "Meta", "Netflix", "Nvidia",
    "Adobe", "Salesforce", "Oracle", "IBM", "Intel", "Cisco", "SAP",
    "Uber", "Lyft", "Airbnb", "DoorDash", "Instacart", "Pinterest",
    "Snap Inc", "Reddit", "LinkedIn", "Spotify", "Dropbox", "Slack", "Zoom",
    "eBay", "Etsy", "Booking.com", "Expedia Group", "Roku", "Yelp",
    # Cloud / dev tools / infra
    "VMware", "ServiceNow", "Atlassian", "Twilio", "Datadog",
    "Snowflake", "MongoDB Inc", "Databricks", "Palantir Technologies",
    "HashiCorp", "GitLab", "GitHub", "Figma", "Notion Labs", "Asana",
    "Cloudflare", "DigitalOcean", "Okta", "Splunk", "CrowdStrike",
    "Palo Alto Networks", "Fortinet", "New Relic", "Elastic",
    # Fintech / payments
    "Stripe", "Square", "PayPal", "Coinbase", "Robinhood", "Block",
    "Affirm", "Chime", "Plaid", "Visa", "Mastercard", "American Express",
    # Enterprise / consulting / hardware
    "Dell Technologies", "HP Inc", "Lenovo", "Samsung Electronics",
    "Sony", "LG Electronics", "Qualcomm", "AMD", "Broadcom",
    "Texas Instruments", "Micron Technology", "Accenture", "Deloitte",
    "McKinsey & Company", "EY", "PwC", "KPMG", "Booz Allen Hamilton",
    "Infosys", "TCS", "Wipro", "Cognizant", "Capgemini", "DXC Technology",
    # Games / media / creative tools
    "Epic Games", "Unity Technologies", "Electronic Arts",
    "Activision Blizzard", "Roblox", "Canva", "Grammarly", "Duolingo",
    "Airtable", "Autodesk",
    # Finance / banking / healthcare / industrial
    "Goldman Sachs", "JPMorgan Chase", "Morgan Stanley", "Capital One",
    "Wells Fargo", "Bank of America", "Citigroup", "UnitedHealth Group",
    "CVS Health", "Johnson & Johnson", "Pfizer", "Moderna",
    "Boston Consulting Group", "Siemens", "General Electric",
    "Ford Motor Company", "General Motors", "Rivian", "Waymo",
    "Boeing", "Lockheed Martin", "SpaceX", "Tesla",
    # Retail / telecom / entertainment
    "Walmart", "Target", "Costco", "Home Depot", "Nike", "Disney",
    "Warner Bros Discovery", "Comcast", "AT&T", "Verizon", "T-Mobile",
    # AI-native
    "OpenAI", "Anthropic", "Hugging Face", "Scale AI",
]

LOCATIONS: List[str] = [
    "Remote", "Remote", "Remote", "Remote (US)", "Remote (EU)", "Remote (APAC)",  # weighted — remote is common in the real data too
    "San Francisco, CA", "New York, NY", "Seattle, WA", "Austin, TX",
    "Boston, MA", "Chicago, IL", "Denver, CO", "Los Angeles, CA",
    "Atlanta, GA", "Toronto, ON", "London, UK", "Berlin, Germany",
    "Bangalore, India", "Dublin, Ireland", "Amsterdam, Netherlands",
    "Singapore", "Sydney, Australia", "Vancouver, BC", "Portland, OR",
    "Raleigh, NC", "Miami, FL", "Washington, DC", "Pune, India",
    "Paris, France", "Madrid, Spain", "Stockholm, Sweden", "Zurich, Switzerland",
    "Tokyo, Japan", "Tel Aviv, Israel", "Sao Paulo, Brazil", "Mexico City, Mexico",
    "Hyderabad, India", "Melbourne, Australia", "Dallas, TX", "Minneapolis, MN",
    "Philadelphia, PA", "Salt Lake City, UT",
]

SENIORITY_PREFIXES: List[Tuple[str, float]] = [
    ("Junior ", 0.15),
    ("", 0.35),
    ("Mid-Level ", 0.15),
    ("Senior ", 0.25),
    ("Staff ", 0.05),
    ("Lead ", 0.05),
]

SALARY_BASE_RANGES: Dict[str, Tuple[int, int]] = {
    "software engineer": (95000, 165000),
    "backend developer": (95000, 160000),
    "frontend developer": (90000, 150000),
    "full stack developer": (95000, 155000),
    "data scientist": (110000, 170000),
    "data analyst": (70000, 105000),
    "data engineer": (110000, 165000),
    "machine learning engineer": (125000, 185000),
    "ai engineer": (130000, 190000),
    "devops engineer": (105000, 160000),
    "cloud engineer": (105000, 158000),
    "site reliability engineer": (115000, 170000),
    "mobile developer": (95000, 155000),
    "android developer": (95000, 150000),
    "ios developer": (95000, 155000),
    "qa engineer": (75000, 120000),
    "test automation engineer": (85000, 130000),
    "cybersecurity analyst": (95000, 150000),
    "database administrator": (90000, 140000),
    "product manager": (105000, 165000),
    "ui ux designer": (80000, 135000),
}

# Skill pools per role — drawn from skills_taxonomy.py's full 250+ skill
# registry (kept consistent with resume-parsing elsewhere) so every tracked
# role covers real breadth: not just the 8-10 most obvious skills, but the
# tools, platforms, and practices an actual posting for that role would
# plausibly mention. A single job still only samples a realistic handful
# (see MIN_SKILLS_PER_JOB/MAX_SKILLS_PER_JOB below) — the large pool is what
# gives the corpus its variety across thousands of postings, not any one job.
_TAXONOMY = set(SKILLS_TAXONOMY)


def _pool(*names: str) -> List[str]:
    """Keeps every name — some (like 'CSS'/'HTML') are taxonomy canonical
    names, and this also accepts role-specific names outside the taxonomy
    if ever needed."""
    return list(names)


ROLE_SKILL_POOLS: Dict[str, List[str]] = {
    "software engineer": _pool(
        "Python", "Java", "Go", "C++", "SQL", "Git", "Docker", "REST API",
        "Microservices", "Agile", "AWS", "PostgreSQL", "Kubernetes", "CI/CD",
        "System Design", "OOP", "Design Patterns", "Code Review", "Linux",
        "GraphQL", "Redis", "Jenkins", "TDD",
    ),
    "backend developer": _pool(
        "Python", "Node.js", "Java", "SQL", "PostgreSQL", "MySQL", "Docker",
        "REST API", "GraphQL", "Microservices", "Redis", "AWS", "Django",
        "FastAPI", "MongoDB", "gRPC", "RabbitMQ", "Kafka", "System Design",
        "Nginx", "CI/CD",
    ),
    "frontend developer": _pool(
        "React", "JavaScript", "TypeScript", "CSS", "HTML", "Next.js", "Vue",
        "Svelte", "Tailwind CSS", "GraphQL", "Git", "Angular", "Redux",
        "jQuery", "Webpack", "Vite", "Sass", "Bootstrap", "Material UI",
        "Accessibility", "REST API",
    ),
    "full stack developer": _pool(
        "React", "Node.js", "TypeScript", "SQL", "Docker", "JavaScript",
        "PostgreSQL", "Next.js", "REST API", "AWS", "Git", "GraphQL",
        "MongoDB", "Tailwind CSS", "CI/CD", "Redux", "System Design",
    ),
    "data scientist": _pool(
        "Python", "SQL", "Pandas", "scikit-learn", "Machine Learning",
        "TensorFlow", "PyTorch", "NumPy", "Data Analysis", "Deep Learning",
        "R", "NLP", "Statistics", "Feature Engineering", "XGBoost",
        "LightGBM", "Keras", "Data Visualization", "MLflow", "A/B Testing",
    ),
    "data analyst": _pool(
        "SQL", "Python", "Pandas", "Data Visualization", "Excel",
        "Data Analysis", "R", "PostgreSQL", "Tableau", "Power BI", "Looker",
        "Qlik", "Alteryx", "Statistics", "BigQuery", "A/B Testing",
    ),
    "data engineer": _pool(
        "Python", "SQL", "Docker", "Kubernetes", "AWS", "PostgreSQL",
        "Airflow", "Spark", "Kafka", "GCP", "Data Analysis", "Hadoop",
        "Hive", "dbt", "Snowflake", "BigQuery", "Redshift", "Databricks",
        "ETL", "Data Warehousing", "Data Governance",
    ),
    "machine learning engineer": _pool(
        "Python", "TensorFlow", "PyTorch", "Docker", "Machine Learning",
        "AWS", "Deep Learning", "Kubernetes", "scikit-learn", "NumPy",
        "MLOps", "Keras", "XGBoost", "MLflow", "Ray", "Feature Engineering",
        "Spark", "LangChain",
    ),
    "ai engineer": _pool(
        "Python", "PyTorch", "TensorFlow", "NLP", "Machine Learning",
        "Deep Learning", "LLMs", "Prompt Engineering", "AWS", "Docker",
        "Vector Databases", "LangChain", "Hugging Face Transformers",
        "MLOps", "OpenCV", "Kubernetes",
    ),
    "devops engineer": _pool(
        "Docker", "Kubernetes", "AWS", "Terraform", "CI/CD", "Linux",
        "Jenkins", "Azure", "GCP", "Ansible", "Git", "Helm", "ArgoCD",
        "GitHub Actions", "GitLab CI", "Chef", "Puppet", "Prometheus",
        "Grafana", "Datadog", "Nginx", "Bash",
    ),
    "cloud engineer": _pool(
        "AWS", "Azure", "GCP", "Terraform", "Kubernetes", "Docker", "CI/CD",
        "Linux", "Cloud Security", "Serverless", "AWS Lambda", "Cloudflare",
        "Load Balancing", "DigitalOcean", "Pulumi", "Helm",
    ),
    "site reliability engineer": _pool(
        "Kubernetes", "Docker", "AWS", "Terraform", "Linux", "CI/CD",
        "Prometheus", "Grafana", "Incident Response", "Python", "Datadog",
        "New Relic", "Splunk", "ELK Stack", "Nagios", "Load Balancing",
        "Bash",
    ),
    "mobile developer": _pool(
        "Swift", "Kotlin", "React Native", "Flutter", "JavaScript", "Git",
        "REST API", "Agile", "Dart", "Firebase", "App Store Deployment",
        "Google Play Console", "API Testing",
    ),
    "android developer": _pool(
        "Kotlin", "Java", "Android SDK", "Git", "REST API",
        "Jetpack Compose", "Agile", "Firebase", "Espresso",
        "Google Play Console", "Performance Testing",
    ),
    "ios developer": _pool(
        "Swift", "SwiftUI", "Xcode", "Git", "REST API", "Agile",
        "Objective-C", "XCTest", "App Store Deployment", "Firebase",
    ),
    "qa engineer": _pool(
        "Selenium", "Manual Testing", "Test Planning", "Agile", "SQL",
        "Git", "REST API", "API Testing", "Postman", "JUnit", "Playwright",
        "Performance Testing", "Load Testing",
    ),
    "test automation engineer": _pool(
        "Selenium", "Cypress", "Python", "CI/CD", "Test Planning", "Git",
        "Java", "Playwright", "Appium", "API Testing", "JUnit", "BDD",
        "TDD",
    ),
    "cybersecurity analyst": _pool(
        "Cloud Security", "SIEM", "Penetration Testing", "Linux", "Python",
        "Incident Response", "SOC 2", "Network Security", "OAuth", "JWT",
        "SSO", "Identity and Access Management", "Vulnerability Assessment",
        "Threat Modeling", "Firewall Configuration", "Zero Trust Architecture",
        "Encryption", "GDPR Compliance", "ISO 27001", "Malware Analysis",
        "DevSecOps",
    ),
    "database administrator": _pool(
        "PostgreSQL", "MySQL", "SQL", "MongoDB", "Redis", "Linux",
        "Backup & Recovery", "Database Tuning", "Oracle Database",
        "SQL Server", "MariaDB", "Database Replication", "Query Optimization",
        "Data Warehousing", "ETL",
    ),
    "product manager": _pool(
        "Agile", "Scrum", "Product Strategy", "Roadmapping", "SQL", "Jira",
        "Stakeholder Management", "A/B Testing", "Product Analytics",
        "User Stories", "OKRs", "Competitive Analysis", "Confluence",
        "Notion", "Data Analysis",
    ),
    "ui ux designer": _pool(
        "Figma", "Wireframing", "User Research", "Prototyping",
        "Design Systems", "Sketch", "Usability Testing", "Adobe XD",
        "Photoshop", "Illustrator", "InVision", "Interaction Design",
        "Information Architecture", "Accessibility", "Design Thinking",
        "User Personas", "Journey Mapping", "Visual Design", "Motion Design",
        "Typography",
    ),
}

# Sanity check: every tracked role needs a pool, and vice versa — a role
# renamed in role_graph.py without updating this dict would otherwise seed
# silently-wrong (or zero) skills for it.
_missing = set(TRACKED_ROLES) - set(ROLE_SKILL_POOLS)
_extra = set(ROLE_SKILL_POOLS) - set(TRACKED_ROLES)
if _missing or _extra:
    raise RuntimeError(
        f"ROLE_SKILL_POOLS is out of sync with TRACKED_ROLES — missing={_missing} extra={_extra}"
    )


MIN_SKILLS_PER_JOB = 4
MAX_SKILLS_PER_JOB = 12  # keeps individual postings realistic even though pools now run 13-22 skills deep


def _pick_title(role: str, rng: random.Random) -> str:
    prefix = rng.choices(
        [p for p, _ in SENIORITY_PREFIXES],
        weights=[w for _, w in SENIORITY_PREFIXES],
        k=1,
    )[0]
    return f"{prefix}{role.title()}"


def seed_demo_database(reset: bool = False) -> int:
    db = SessionLocal()
    rng = random.Random(RNG_SEED)
    today = date.today()

    try:
        if reset:
            logger.info("Dropping and recreating schema (--reset)...")
            Base.metadata.drop_all(bind=engine)
            Base.metadata.create_all(bind=engine)
        else:
            Base.metadata.create_all(bind=engine)

        if db.query(Job).count() > 0:
            logger.info("Jobs already present — pass --reset to wipe and reseed. Skipping.")
            return 0

        companies = [Company(name=name) for name in COMPANIES]
        db.add_all(companies)
        db.flush()

        all_skill_names = {s for pool in ROLE_SKILL_POOLS.values() for s in pool}
        skill_cache: Dict[str, Skill] = {}
        for name in sorted(all_skill_names):
            skill = db.query(Skill).filter_by(name=name).first()
            if not skill:
                skill = Skill(name=name)
                db.add(skill)
            skill_cache[name] = skill
        db.flush()

        job_objects: List[Job] = []
        job_skill_links: List[Tuple[Job, List[str]]] = []
        external_id_counter = 0

        for role in TRACKED_ROLES:
            pool = ROLE_SKILL_POOLS[role]
            low, high = SALARY_BASE_RANGES[role]
            posting_count = rng.randint(*POSTINGS_PER_ROLE)

            for _ in range(posting_count):
                external_id_counter += 1
                company = rng.choice(companies)
                location = rng.choice(LOCATIONS)
                title = _pick_title(role, rng)
                posted_date = today - timedelta(days=rng.randint(0, POSTING_WINDOW_DAYS))

                seniority_bump = 1.0
                if title.startswith(("Senior", "Staff", "Lead")):
                    seniority_bump = 1.25
                elif title.startswith("Junior"):
                    seniority_bump = 0.8

                salary_mid = int(rng.randint(low, high) * seniority_bump)
                spread = int(salary_mid * 0.12)

                job = Job(
                    external_id=f"demo-{external_id_counter}",
                    title=title,
                    company_id=company.id,
                    location=location,
                    description=(
                        f"{company.name} is hiring a {title} to join our team in "
                        f"{location}. You'll work across our stack with a strong focus "
                        f"on {', '.join(rng.sample(pool, k=min(3, len(pool))))}, "
                        "collaborating closely with cross-functional teams to ship "
                        "reliable, well-tested features."
                    ),
                    category="IT Jobs",
                    source=rng.choice(["adzuna", "remoteok"]),
                    posted_date=posted_date,
                    salary_min=max(0, salary_mid - spread),
                    salary_max=salary_mid + spread,
                )
                job_objects.append(job)

                sample_size = rng.randint(
                    min(MIN_SKILLS_PER_JOB, len(pool)), min(MAX_SKILLS_PER_JOB, len(pool))
                )
                chosen = rng.sample(pool, k=sample_size)
                job_skill_links.append((job, chosen))

        db.add_all(job_objects)
        db.flush()

        job_skill_objects: List[JobSkill] = []
        seen_pairs = set()
        for job, skill_names in job_skill_links:
            for name in skill_names:
                key = (job.id, skill_cache[name].id)
                if key in seen_pairs:
                    continue
                seen_pairs.add(key)
                job_skill_objects.append(JobSkill(job_id=job.id, skill_id=skill_cache[name].id))

        db.add_all(job_skill_objects)
        db.commit()

        total = len(job_objects)
        logger.info(
            "Seeded %d jobs across %d roles, %d companies, %d skills, %d job-skill links.",
            total, len(TRACKED_ROLES), len(companies), len(skill_cache), len(job_skill_objects),
        )
        return total

    except Exception:
        db.rollback()
        logger.exception("Failed to seed demo database.")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_database(reset="--reset" in sys.argv)
