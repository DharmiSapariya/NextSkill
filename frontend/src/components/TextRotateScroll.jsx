import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/cn";

function TextRotate({ text }) {
  const letters = text.split("");
  return (
    <AnimatePresence mode="wait">
      <motion.span key={text} className="inline-flex overflow-hidden">
        {letters.map((letter, i) => (
          <motion.span
            key={`${letter}-${i}`}
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-100%", opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300, delay: i * 0.02 }}
            className="inline-block"
          >
            {letter === " " ? " " : letter}
          </motion.span>
        ))}
      </motion.span>
    </AnimatePresence>
  );
}

export default function TextRotateScroll({ items }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const refs = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.dataset.index);
            setActiveIndex(idx);
          }
        });
      },
      { threshold: 0.6 }
    );
    refs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [items.length]);

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-10">
      <div className="font-display text-3xl font-bold text-forest md:w-64 md:shrink-0">
        <TextRotate text={items[activeIndex]?.label ?? ""} />
      </div>
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4">
        {items.map((item, i) => (
          <a
            key={item.label}
            ref={(el) => (refs.current[i] = el)}
            data-index={i}
            href={item.link}
            className={cn(
              "relative h-36 w-36 shrink-0 snap-center overflow-hidden rounded-xl border border-forest transition-opacity",
              i === activeIndex ? "opacity-100" : "opacity-50"
            )}
          >
            {item.node}
          </a>
        ))}
      </div>
    </div>
  );
}
