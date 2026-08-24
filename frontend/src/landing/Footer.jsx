import { Link } from "react-router-dom";

const COLUMNS = [
  {
    heading: "Product",
    links: [
      { to: "/recommend", label: "Recommend" },
      { to: "/explore-skill", label: "Explore a Skill" },
      { to: "/career-paths", label: "Career Paths" },
      { to: "/skill-network", label: "Skill Network" },
    ],
  },
  {
    heading: "Data",
    links: [
      { to: "/resume-salary", label: "Resume & Salary" },
      { to: "/jobs", label: "Jobs" },
      { to: "/companies", label: "Companies" },
    ],
  },
  {
    heading: "Account",
    links: [
      { to: "/login", label: "Log in / Sign up" },
      { to: "/account", label: "My Account" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-charcoal px-6 py-16 text-cream/70">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-12 sm:flex-row sm:justify-between">
          <div className="max-w-xs">
            <span className="font-display text-2xl font-bold text-cream">NextSkill</span>
            <p className="mt-3 font-sans text-sm leading-relaxed text-cream/50">
              Career intelligence built from real job-posting data — the skills that matter, ranked by how much they
              actually matter.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {COLUMNS.map((column) => (
              <div key={column.heading} className="flex flex-col gap-3">
                <span className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-cream/40">
                  {column.heading}
                </span>
                {column.links.map((link) => (
                  <Link key={link.to} to={link.to} className="font-sans text-sm text-cream/70 hover:text-lime">
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-2 border-t border-cream/10 pt-6 font-sans text-xs text-cream/40 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} NextSkill. All rights reserved.</span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-lime" />
            Built on real job-market data
          </span>
        </div>
      </div>
    </footer>
  );
}
