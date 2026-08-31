import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "../lib/cn";

const THEME = {
  periwinkle: "border-periwinkle/40 bg-periwinkle/10",
  lime: "border-lime/40 bg-lime/10",
};

const OFFSETS = [
  "md:translate-y-0",
  "md:translate-y-10",
  "md:-translate-y-4",
  "md:translate-y-6",
];

function StepCard({ step, index }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const theme = index % 2 === 0 ? "periwinkle" : "lime";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.12, ease: "easeOut" }}
      className={cn(
        "relative rounded-3xl border p-6 backdrop-blur-sm",
        THEME[theme],
        OFFSETS[index]
      )}
    >
      <span className="font-kicker text-3xl text-cream-on-dark/80">
        {String(index + 1).padStart(2, "0")}
      </span>
      <h3 className="mt-4 font-display text-lg font-bold text-cream-on-dark">{step.title}</h3>
      <p className="mt-2 text-sm text-cream-on-dark/70">{step.description}</p>
    </motion.div>
  );
}

export default function HowItWorks({ steps }) {
  return (
    <div className="relative">
      <svg
        className="pointer-events-none absolute inset-0 hidden h-full w-full md:block"
        preserveAspectRatio="none"
      >
        <line
          x1="12%"
          y1="50%"
          x2="88%"
          y2="50%"
          stroke="var(--periwinkle)"
          strokeOpacity="0.4"
          strokeWidth="2"
          strokeDasharray="8 6"
        >
          <animate attributeName="stroke-dashoffset" from="0" to="-28" dur="1.2s" repeatCount="indefinite" />
        </line>
      </svg>
      <div className="relative grid grid-cols-1 gap-6 md:grid-cols-4">
        {steps.map((step, i) => (
          <StepCard key={step.title} step={step} index={i} />
        ))}
      </div>
    </div>
  );
}
