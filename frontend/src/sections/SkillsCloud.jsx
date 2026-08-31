import Highlighter from "../components/Highlighter";
import IconCloud from "../components/IconCloud";

const icons = [
  { name: "Python", slug: "python" },
  { name: "Java", slug: "openjdk" },
  { name: "JavaScript", slug: "javascript" },
  { name: "TypeScript", slug: "typescript" },
  { name: "Go", slug: "go" },
  { name: "Rust", slug: "rust" },
  { name: "React", slug: "react" },
  { name: "Angular", slug: "angular" },
  { name: "Vue", slug: "vuedotjs" },
  { name: "Next.js", slug: "nextdotjs" },
  { name: "Node.js", slug: "nodedotjs" },
  { name: "Django", slug: "django" },
  { name: "Flask", slug: "flask" },
  { name: "FastAPI", slug: "fastapi" },
  { name: "Spring Boot", slug: "springboot" },
  { name: "Tailwind CSS", slug: "tailwindcss" },
  { name: "Pandas", slug: "pandas" },
  { name: "NumPy", slug: "numpy" },
  { name: "scikit-learn", slug: "scikitlearn" },
  { name: "TensorFlow", slug: "tensorflow" },
  { name: "PyTorch", slug: "pytorch" },
  { name: "PostgreSQL", slug: "postgresql" },
  { name: "MySQL", slug: "mysql" },
  { name: "MongoDB", slug: "mongodb" },
  { name: "Redis", slug: "redis" },
  { name: "AWS", slug: "amazonaws" },
  { name: "Azure", slug: "microsoftazure" },
  { name: "GCP", slug: "googlecloud" },
  { name: "Docker", slug: "docker" },
  { name: "Kubernetes", slug: "kubernetes" },
  { name: "Terraform", slug: "terraform" },
  { name: "Git", slug: "git" },
  { name: "GraphQL", slug: "graphql" },
];

export default function SkillsCloud() {
  return (
    <section id="skills" className="bg-cream px-6 py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-display text-[clamp(1.75rem,4vw,2.5rem)] font-bold leading-tight text-forest">
          We track{" "}
          <Highlighter action="highlight" color="var(--periwinkle)" isView>
            skills
          </Highlighter>{" "}
          across the roles that matter.
        </h2>
      </div>

      <div className="relative mx-auto mt-8 h-[400px] max-w-2xl overflow-hidden">
        <IconCloud icons={icons} showControl />
      </div>

      <p className="mx-auto mt-4 max-w-md text-center text-[15px] text-ink/60">
        A living taxonomy, extracted from real postings with spaCy and a curated skills
        dictionary — not a fixed list that goes stale.
      </p>
    </section>
  );
}
