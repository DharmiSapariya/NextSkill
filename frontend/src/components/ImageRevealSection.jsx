import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

function RevealCard({ item, index, total }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "start 0.3"],
  });

  const clip = useTransform(scrollYProgress, [0, 1], ["inset(18% round 24px)", "inset(0% round 24px)"]);
  const brightness = useTransform(scrollYProgress, [0, 1], [0.4, 1]);
  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <div ref={ref} className="relative mb-16 last:mb-0">
      <motion.div
        style={{ clipPath: clip, opacity, filter: useTransform(brightness, (b) => `brightness(${b})`) }}
        className="relative h-[320px] overflow-hidden rounded-3xl border border-cream-on-dark/10 md:h-[420px]"
      >
        {item.node}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-forest-2/90 to-transparent p-6">
          <span className="font-kicker text-xs uppercase tracking-widest text-cream-on-dark/70">
            {item.subtitle}
          </span>
          <h3 className="mt-1 font-display text-2xl font-bold text-cream-on-dark">{item.title}</h3>
        </div>
      </motion.div>
    </div>
  );
}

export default function ImageRevealSection({ items }) {
  return (
    <div className="mx-auto max-w-4xl px-4">
      {items.map((item, i) => (
        <RevealCard key={item.title} item={item} index={i} total={items.length} />
      ))}
    </div>
  );
}
