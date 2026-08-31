import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import IllustrationCard from "./IllustrationCard";

const STATS = [
  { value: 40000, suffix: "+", label: "job postings parsed monthly" },
  { value: 1200, suffix: "+", label: "distinct skills tracked" },
  { value: 96, suffix: "%", label: "of gaps mapped to a real posting" },
];

function useCountUp(target, active, duration = 1.4) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return undefined;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setValue(target);
      return undefined;
    }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);

  return value;
}

function Stat({ stat, index }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const value = useCountUp(stat.value, inView);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="flex flex-col gap-2 border-t border-forest/15 pt-6 first:border-t-0 sm:border-t-0 sm:border-l sm:pl-8 sm:pt-0 sm:first:border-l-0 sm:first:pl-0"
    >
      <span className="font-display text-5xl font-semibold text-forest sm:text-6xl">
        {value.toLocaleString()}
        {stat.suffix}
      </span>
      <span className="font-sans text-sm text-charcoal/60">{stat.label}</span>
    </motion.div>
  );
}

export default function StatsBand() {
  return (
    <section className="bg-periwinkle/25 px-6 py-24 sm:py-28">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 lg:grid-cols-[1fr_1.2fr]">
        <IllustrationCard src="/illustrations/community.png" alt="" className="mx-auto w-full max-w-sm" delay={0.1} />
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {STATS.map((stat, index) => (
            <Stat key={stat.label} stat={stat} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
