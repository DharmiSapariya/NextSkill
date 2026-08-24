import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import SectionHeading from "./SectionHeading";

const MotionLink = motion.create(Link);

// One card per nav destination, so the landing page functions as a real
// map of the product rather than marketing copy about a product you
// can't see yet. Hovering a card dims and slightly desaturates its
// siblings (a focus-grid interaction) so attention narrows to whichever
// feature the visitor is actually reading about.
const FEATURES = [
  {
    to: "/recommend",
    label: "Recommend",
    title: "Skill gaps, ranked",
    copy: "See exactly which skills close the distance between your resume and the roles you're targeting — ranked by how much each one actually moves the needle.",
    illustration: "/illustrations/recommend.svg",
  },
  {
    to: "/explore-skill",
    label: "Explore a Skill",
    title: "Every skill, in context",
    copy: "Demand trends, adjacent skills, and the roles that ask for it most — pulled straight from live job postings, not a static glossary.",
    illustration: "/illustrations/explore-skill.svg",
  },
  {
    to: "/career-paths",
    label: "Career Paths",
    title: "The route, not just the destination",
    copy: "See the realistic next step from where you are, and the one after that — a path built from how people actually move between roles.",
    illustration: "/illustrations/career-paths.svg",
  },
  {
    to: "/skill-network",
    label: "Skill Network",
    title: "How skills connect",
    copy: "Explore the graph of skills that travel together, so one strong skill on your resume can tell you what to learn next.",
    illustration: "/illustrations/skill-network.svg",
  },
  {
    to: "/resume-salary",
    label: "Resume & Salary",
    title: "Know what you're worth",
    copy: "Upload a resume, get a market-aware salary estimate and a plain-English read on what's holding the number back.",
    illustration: "/illustrations/resume-salary.svg",
  },
  {
    to: "/jobs",
    label: "Jobs",
    title: "Postings that actually fit",
    copy: "Real listings matched against your skill profile, not keyword-stuffed noise — so every result is worth the click.",
    illustration: "/illustrations/jobs.svg",
  },
  {
    to: "/companies",
    label: "Companies",
    title: "Who's actually hiring for this",
    copy: "See which companies are posting for your target role right now, and what they're asking candidates to bring.",
    illustration: "/illustrations/companies.svg",
  },
];

export default function FeatureGrid() {
  const [activeIndex, setActiveIndex] = useState(null);

  return (
    <section className="bg-cream px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="The product"
          heading="Seven ways in, one map underneath"
          body="Every card below is a real, working part of NextSkill — not a preview. Pick the one that matches where you're stuck."
        />

        <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4" onMouseLeave={() => setActiveIndex(null)}>
          {FEATURES.map((feature, index) => {
            const dimmed = activeIndex !== null && activeIndex !== index;
            return (
              <MotionLink
                key={feature.to}
                to={feature.to}
                data-cursor="view"
                onMouseEnter={() => setActiveIndex(index)}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: (index % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
                animate={{
                  opacity: dimmed ? 0.5 : 1,
                  filter: dimmed ? "saturate(0.5)" : "saturate(1)",
                  scale: activeIndex === index ? 1.015 : 1,
                }}
                className={`group relative flex flex-col overflow-hidden rounded-3xl border p-6 transition-colors duration-300 ${
                  index === 0 ? "sm:col-span-2" : ""
                } ${activeIndex === index ? "border-forest/40 bg-white" : "border-forest/10 bg-white/70"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.25em] text-forest/50">
                    {feature.label}
                  </span>
                  <ArrowUpRight
                    className="h-4 w-4 shrink-0 text-forest/40 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-forest"
                    strokeWidth={2}
                  />
                </div>

                <div className="mx-auto my-4 h-32 w-full max-w-[180px]">
                  <img src={feature.illustration} alt="" className="h-full w-full object-contain" draggable={false} />
                </div>

                <h3 className="font-display text-xl font-semibold text-charcoal">{feature.title}</h3>
                <p className="mt-2 flex-1 font-sans text-sm leading-relaxed text-charcoal/65">{feature.copy}</p>
              </MotionLink>
            );
          })}
        </div>
      </div>
    </section>
  );
}
