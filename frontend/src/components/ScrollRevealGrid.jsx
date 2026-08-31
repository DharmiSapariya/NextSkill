import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "../lib/cn";

function CardItem({ item, index }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
      className={cn(
        "relative flex flex-col justify-between overflow-hidden rounded-3xl border border-forest/10 bg-cream p-6",
        item.span
      )}
    >
      <span className="font-kicker text-xs uppercase tracking-widest text-forest/60">
        {item.kicker}
      </span>
      <div>
        <h3 className="mt-6 font-display text-xl font-bold text-forest">{item.title}</h3>
        <p className="mt-2 max-w-xs text-sm text-forest/70">{item.description}</p>
      </div>
      <img
        src={item.illustration}
        alt=""
        className="pointer-events-none absolute right-4 top-4 w-[140px] object-contain"
      />
    </motion.div>
  );
}

export default function ScrollRevealGrid({ items }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      {items.map((item, i) => (
        <CardItem key={item.title} item={item} index={i} />
      ))}
    </div>
  );
}
