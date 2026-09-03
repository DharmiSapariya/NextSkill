import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ArrowRight, HelpCircle } from "lucide-react";
import Highlighter from "../components/Highlighter";
import DoodleCircle from "../components/DoodleCircle";

// Every answer here describes something the product actually does — no
// promises about pricing, privacy, or data freshness beyond what the app
// itself implements (see Pricing.jsx and SharedReport for the source of
// truth on tiers and link-sharing).
const faqs = [
  {
    q: "Is NextSkill actually free?",
    a: "Yes. The Free plan includes skill-gap recommendations, match score, salary prediction, resume parsing, and your full report history — no credit card, no trial countdown. Pro adds a higher history/evidence ceiling on top of the same features.",
  },
  {
    q: "Where do the recommendations come from?",
    a: "Real job postings we ingest on a regular schedule — not a generic \"top skills\" list or an AI guess. Every gap skill you're shown links back to the actual postings that mention it, so you can check the evidence yourself instead of trusting a black box.",
  },
  {
    q: "How is my match score calculated?",
    a: "We compare your skill list against real postings for the target role and check what share of them your skills would clear a minimum overlap with. It's a count of real postings, not a subjective rating.",
  },
  {
    q: "Can I upload my resume instead of typing my skills?",
    a: "Yes — drop in a PDF or DOCX on the Resume Upload page and we auto-parse the tracked skills it finds, merging them into your profile. You can still add or remove skills by hand afterward.",
  },
  {
    q: "What's the difference between Free and Pro?",
    a: "Both plans get the same features. Pro keeps more report history (100 runs vs. 20) and shows more evidence postings per gap skill (10 vs. 3) — nothing is gated behind a paywall, Pro just goes deeper on the same data.",
  },
  {
    q: "Can I share my results with someone else?",
    a: "Yes — any skill-gap report you run can be published as a public link from your History page, viewable by anyone without an account. You control which reports get published, and can revoke a link at any time.",
  },
  {
    q: "Do you sell or share my data?",
    a: "Your skills, saved jobs, and reports stay private to your account by default. The only way anything becomes public is if you explicitly publish a report as a shareable link — and you can revoke that link whenever you want.",
  },
];

function FAQItem({ item, isOpen, onToggle, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.3, delay: Math.min(index, 6) * 0.04 }}
      className="overflow-hidden rounded-2xl border border-forest/10 bg-white/70"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"
      >
        <span className="font-display text-base font-bold text-forest sm:text-lg">{item.q}</span>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
            isOpen ? "bg-forest text-cream" : "bg-forest/8 text-forest"
          }`}
        >
          <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="h-4 w-4" />
          </motion.span>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-5 text-sm leading-relaxed text-forest/65 sm:px-6 sm:pb-6">{item.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="relative overflow-hidden bg-cream px-6 py-24">
      {/* Decorative background — soft palette blobs + doodle arrows/circles,
          matching the illustration language used elsewhere on the landing
          page (Problem/Solution/Hero), so this section doesn't read as a
          flat, disconnected color band. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-16 h-72 w-72 rounded-full bg-periwinkle/40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 top-1/3 h-64 w-64 rounded-full bg-lime/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-1/4 h-56 w-56 rounded-full bg-periwinkle/25 blur-3xl"
      />
      <img
        src="/doodles/three.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute right-[6%] top-6 hidden w-16 -scale-x-100 opacity-50 md:block"
      />
      <img
        src="/doodles/seven.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute bottom-10 left-[4%] hidden w-24 rotate-[8deg] opacity-60 lg:block"
      />
      <img
        src="/doodles/two.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute right-[10%] bottom-16 hidden w-14 rotate-12 opacity-40 md:block"
      />

      <div className="relative mx-auto max-w-3xl">
        <div className="text-center">
          <span className="relative inline-flex items-center justify-center gap-1.5 font-kicker text-xs uppercase tracking-widest text-forest/50">
            <span className="pointer-events-none absolute -inset-x-4 -inset-y-2 rounded-full border border-dashed border-forest/20" />
            <HelpCircle className="h-3.5 w-3.5" /> Frequently asked
          </span>
          <h2 className="mt-3 font-display text-[clamp(1.75rem,4vw,2.5rem)] font-bold leading-tight text-forest">
            Questions people <DoodleCircle color="periwinkle">actually</DoodleCircle>{" "}
            <Highlighter action="highlight" color="var(--lime)" isView>
              ask us
            </Highlighter>
            .
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] text-forest/65">
            Straight answers, no marketing spin — if it's not true of the product, it's not in here.
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-3">
          {faqs.map((item, i) => (
            <FAQItem key={item.q} item={item} index={i} isOpen={openIndex === i} onToggle={() => setOpenIndex(openIndex === i ? -1 : i)} />
          ))}
        </div>

        <div className="relative mt-10 flex flex-wrap items-center justify-center gap-3 text-center">
          <p className="text-sm text-forest/55">Still have a question?</p>
          <Link
            to="/signup"
            className="flex items-center gap-1.5 text-sm font-semibold text-forest underline underline-offset-2 hover:text-forest/70"
          >
            Just try it — it's free <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
