// Mirrors backend/skills_taxonomy.py's category groupings (plus the
// role-specific extras seed_demo_data.py adds that aren't in that taxonomy)
// so the frontend can color-code skills by category — in the Skill Graph,
// skill badges, and the Skills browse page — without the API needing to
// carry category metadata on every skill payload.
export const SKILL_CATEGORIES = {
  Languages: [
    "Python", "Java", "JavaScript", "TypeScript", "C++", "C#", "Go", "Rust", "SQL", "R",
    "Ruby", "PHP", "Scala", "Perl", "MATLAB", "Bash", "PowerShell", "Dart", "Haskell",
    "Julia", "Lua", "COBOL", "Elixir", "Clojure", "Groovy", "VBA", "Solidity",
  ],
  Frameworks: [
    "React", "Angular", "Vue", "Next.js", "Node.js", "Django", "Flask", "FastAPI",
    "Spring Boot", "Express", "Tailwind CSS", "HTML", "CSS", "Svelte", "Nuxt.js",
    "Ruby on Rails", "Laravel", "ASP.NET Core", "NestJS", "jQuery", "Redux", "Bootstrap",
    "Material UI", "Chakra UI", "Gatsby", "Remix", "Symfony", "Hibernate", "Webpack",
    "Vite", "Sass",
  ],
  "Data & ML": [
    "Pandas", "NumPy", "scikit-learn", "TensorFlow", "PyTorch", "Machine Learning",
    "Deep Learning", "NLP", "Data Analysis", "Data Visualization", "MLOps", "LLMs",
    "Prompt Engineering", "Vector Databases", "Airflow", "Spark", "Kafka", "Keras",
    "XGBoost", "LightGBM", "Hugging Face Transformers", "LangChain", "OpenCV",
    "Statistics", "Feature Engineering", "MLflow", "Ray", "Hadoop", "Hive", "dbt",
    "Snowflake", "BigQuery", "Redshift", "Databricks", "Tableau", "Power BI", "Excel",
    "Looker", "Qlik", "Alteryx",
  ],
  Databases: [
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "SQLite", "Cassandra",
    "DynamoDB", "Neo4j", "MariaDB", "Oracle Database", "SQL Server", "CockroachDB",
    "InfluxDB", "Firebase", "Supabase", "ClickHouse",
  ],
  "Cloud & DevOps": [
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "CI/CD", "Terraform", "Jenkins",
    "Ansible", "Cloud Security", "Prometheus", "Grafana", "Incident Response", "Helm",
    "ArgoCD", "GitLab CI", "GitHub Actions", "CircleCI", "Chef", "Puppet", "Datadog",
    "New Relic", "Splunk", "ELK Stack", "Nagios", "Vagrant", "Pulumi", "OpenShift",
    "Nginx", "Serverless", "AWS Lambda", "Cloudflare", "Load Balancing", "DigitalOcean",
    "Heroku", "Vercel", "Netlify",
  ],
  "Tools & Methodologies": [
    "Git", "Linux", "REST API", "GraphQL", "Microservices", "Agile", "Scrum", "Jira",
    "A/B Testing", "Product Strategy", "Roadmapping", "Stakeholder Management", "Kanban",
    "Confluence", "Trello", "Asana", "Notion", "gRPC", "RabbitMQ",
    "Event-Driven Architecture", "Domain-Driven Design", "TDD", "BDD",
    "Pair Programming", "Code Review", "System Design", "OOP", "Design Patterns",
    "Product Analytics", "User Stories", "OKRs", "Competitive Analysis",
  ],
  "Mobile & QA": [
    "Swift", "SwiftUI", "Xcode", "Kotlin", "Android SDK", "Jetpack Compose",
    "React Native", "Flutter", "Objective-C", "Appium", "JUnit", "Postman",
    "API Testing", "Performance Testing", "Load Testing", "Playwright", "Espresso",
    "XCTest", "Selenium", "Cypress", "Manual Testing", "Test Planning",
    "App Store Deployment", "Google Play Console",
  ],
  "Security & Data Ops": [
    "SIEM", "Penetration Testing", "SOC 2", "Network Security", "Backup & Recovery",
    "Database Tuning", "OAuth", "JWT", "SSO", "Identity and Access Management",
    "Vulnerability Assessment", "Threat Modeling", "Firewall Configuration",
    "Zero Trust Architecture", "Encryption", "GDPR Compliance", "ISO 27001",
    "Malware Analysis", "DevSecOps", "Data Governance", "Data Warehousing", "ETL",
    "Database Replication", "Query Optimization",
  ],
  Design: [
    "Figma", "Wireframing", "User Research", "Prototyping", "Design Systems", "Sketch",
    "Usability Testing", "Adobe XD", "Photoshop", "Illustrator", "InVision",
    "Interaction Design", "Information Architecture", "Accessibility", "Design Thinking",
    "User Personas", "Journey Mapping", "Visual Design", "Motion Design", "Typography",
  ],
};

const NAME_TO_CATEGORY = {};
for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
  for (const skill of skills) {
    NAME_TO_CATEGORY[skill.toLowerCase()] = category;
  }
}

export const CATEGORY_COLORS = {
  Languages: "var(--periwinkle)",
  Frameworks: "var(--lime)",
  "Data & ML": "var(--coral)",
  Databases: "var(--sky)",
  "Cloud & DevOps": "var(--amber)",
  "Tools & Methodologies": "var(--violet)",
  "Mobile & QA": "var(--coral)",
  "Security & Data Ops": "var(--amber)",
  Design: "var(--violet)",
  Other: "var(--forest)",
};

export function categoryFor(skillName) {
  return NAME_TO_CATEGORY[(skillName || "").toLowerCase()] || "Other";
}

export function colorFor(skillName) {
  return CATEGORY_COLORS[categoryFor(skillName)];
}
