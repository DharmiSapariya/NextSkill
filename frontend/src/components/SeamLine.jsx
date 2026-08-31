import { useMemo } from "react";
import { motion } from "framer-motion";

// A short lime stitch drawn in the blank gap between two frames only —
// never an overlay across a frame's own content. Each instance picks a
// random curve shape so the page doesn't read as one repeated motif.
const VARIANTS = [
  "M20 0 C 20 30, 140 50, 140 80",
  "M140 0 C 140 30, 20 50, 20 80",
  "M30 0 C 30 20, 110 20, 110 40 C 110 60, 30 60, 30 80",
  "M80 0 C 40 15, 140 35, 80 40 C 20 45, 120 65, 80 80",
  "M10 0 C 60 20, 100 60, 150 80",
  "M150 0 C 100 20, 60 60, 10 80",
];

export default function SeamLine() {
  const d = useMemo(() => VARIANTS[Math.floor(Math.random() * VARIANTS.length)], []);

  return (
    <div className="relative z-20 mx-auto hidden h-20 w-40 bg-cream md:block" aria-hidden="true">
      <svg
        viewBox="0 0 160 80"
        fill="none"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <motion.path
          d={d}
          stroke="var(--lime)"
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, margin: "-30% 0px -30% 0px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </svg>
    </div>
  );
}
