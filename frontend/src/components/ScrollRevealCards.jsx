import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const ACCENTS = ["var(--periwinkle)", "var(--lime)"];

function RevealCard({ step, index }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px -15% 0px" });
  const accent = ACCENTS[index % ACCENTS.length];

  return (
    <div
      ref={ref}
      className="group relative overflow-hidden rounded-3xl border border-cream-on-dark/10 bg-forest-2 p-8 transition-transform duration-300 will-change-transform hover:-translate-y-1.5"
    >
      <motion.div
        initial={{ clipPath: "inset(100% 0% 0% 0%)" }}
        animate={inView ? { clipPath: "inset(0% 0% 0% 0%)" } : {}}
        transition={{ duration: 0.7, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="font-kicker text-4xl" style={{ color: accent }}>
          {String(index + 1).padStart(2, "0")}
        </span>
        <h3 className="mt-5 font-display text-xl font-bold text-cream-on-dark">{step.title}</h3>
        <p className="mt-2 text-sm text-cream-on-dark/70">{step.description}</p>
      </motion.div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 transition-transform duration-500 ease-out group-hover:scale-x-100"
        style={{ background: accent }}
      />
    </div>
  );
}

export default function ScrollRevealCards({ steps }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((step, i) => (
        <RevealCard key={step.title} step={step} index={i} />
      ))}
    </div>
  );
}
