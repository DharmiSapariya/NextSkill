// Mirrors backend/skills_taxonomy.py's category groupings (plus the
// role-specific extras seed_demo_data.py adds that aren't in that taxonomy)
// so the frontend can color-code skills by category — in the Skill Graph,
// skill badges, and the Skills browse page — without the API needing to
// carry category metadata on every skill payload.
export const SKILL_CATEGORIES = {
  Languages: [
    "Python", "Java", "JavaScript", "TypeScript", "C++", "C#", "Go", "Rust", "SQL", "R",
  ],
  Frameworks: [
    "React", "Angular", "Vue", "Next.js", "Node.js", "Django", "Flask", "FastAPI",
    "Spring Boot", "Express", "Tailwind CSS",
  ],
  "Data & ML": [
    "Pandas", "NumPy", "scikit-learn", "TensorFlow", "PyTorch", "Machine Learning",
    "Deep Learning", "NLP", "Data Analysis", "Data Visualization", "MLOps", "LLMs",
    "Prompt Engineering", "Vector Databases", "Airflow", "Spark", "Kafka",
  ],
  Databases: ["PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch"],
  "Cloud & DevOps": [
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "CI/CD", "Terraform", "Jenkins",
    "Ansible", "Cloud Security", "Prometheus", "Grafana", "Incident Response",
  ],
  "Tools & Methodologies": [
    "Git", "Linux", "REST API", "GraphQL", "Microservices", "Agile", "Scrum",
    "Jira", "A/B Testing", "Product Strategy", "Roadmapping", "Stakeholder Management",
  ],
  "Mobile & QA": [
    "Swift", "SwiftUI", "Xcode", "Kotlin", "Android SDK", "Jetpack Compose",
    "React Native", "Flutter", "Selenium", "Cypress", "Manual Testing", "Test Planning",
  ],
  "Security & Data Ops": [
    "SIEM", "Penetration Testing", "SOC 2", "Network Security", "Backup & Recovery",
    "Database Tuning",
  ],
  Design: ["Figma", "Wireframing", "User Research", "Prototyping", "Design Systems", "Sketch", "Usability Testing"],
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
