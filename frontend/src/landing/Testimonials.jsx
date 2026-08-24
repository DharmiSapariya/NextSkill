import { motion } from "framer-motion";
import SectionHeading from "./SectionHeading";

// Loosely-stacked quote cards you can actually grab and toss around —
// each one is real-drag-and-release physics (framer-motion's drag +
// dragElastic + a spring back to start), not just a hover tilt. The
// interaction is in the spirit of the "draggable card" pattern without
// reusing any of its source.
const QUOTES = [
  {
    quote: "I finally understood why I wasn't getting past the first screen. Three skills, all fixable in a weekend.",
    name: "Priya N.",
    role: "Frontend engineer → Senior",
    rotate: -6,
  },
  {
    quote: "The career path feature is the first roadmap I've seen that isn't just \"learn everything.\"",
    name: "Marcus O.",
    role: "Bootcamp grad, first job search",
    rotate: 4,
  },
  {
    quote: "Salary estimate was within 4% of my actual offer. I used it to negotiate, and it worked.",
    name: "Dana K.",
    role: "Product manager, career switcher",
    rotate: -3,
  },
];

export default function Testimonials() {
  return (
    <section className="overflow-hidden bg-forest px-6 py-28 sm:py-36">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="From people who used it"
          heading="Drag one. See what stuck."
          tone="light"
          align="center"
        />

        <div className="mt-20 flex flex-col items-center gap-10 sm:flex-row sm:items-start sm:justify-center sm:gap-6">
          {QUOTES.map((item) => (
            <motion.figure
              key={item.name}
              data-cursor="drag"
              drag
              dragElastic={0.4}
              dragConstraints={{ top: -40, bottom: 40, left: -60, right: 60 }}
              whileDrag={{ scale: 1.05, boxShadow: "0 30px 60px rgba(0,0,0,0.35)" }}
              initial={{ opacity: 0, y: 30, rotate: item.rotate }}
              whileInView={{ opacity: 1, y: 0, rotate: item.rotate }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="w-72 shrink-0 cursor-grab select-none rounded-3xl border border-cream/10 bg-cream p-6 shadow-[0_20px_45px_rgba(0,0,0,0.25)] active:cursor-grabbing"
            >
              <blockquote className="font-display text-lg leading-snug text-charcoal">“{item.quote}”</blockquote>
              <figcaption className="mt-5 flex items-center gap-2 font-sans text-xs uppercase tracking-[0.15em] text-charcoal/50">
                <span className="h-1.5 w-1.5 rounded-full bg-lime" />
                {item.name} — {item.role}
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
