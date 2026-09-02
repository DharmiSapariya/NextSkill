import { useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import DashboardMock from "./DashboardMock";
import { cn } from "../lib/cn";

function TiltPanel({ variant, label }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], [7, -7]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-7, 7]);

  const handleMouseMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - rect.left) / rect.width - 0.5);
    y.set((event.clientY - rect.top) / rect.height - 0.5);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={reset}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      className="h-full w-full"
    >
      <DashboardMock variant={variant} label={label} className="h-full" />
    </motion.div>
  );
}

// A clickable role-tab switcher, replacing the old scroll-snap thumbnail
// row: pick a role, the panel crossfades in, and it tilts toward the
// cursor (a mouse-driven 3D tilt) instead of sitting static.
export default function EvidenceTabs({ items }) {
  const [active, setActive] = useState(0);
  const current = items[active];

  return (
    <div className="grid gap-6 md:grid-cols-[200px_1fr] md:items-start md:gap-10">
      <div className="flex gap-2 overflow-x-auto pb-2 md:flex-col md:overflow-visible md:pb-0">
        {items.map((item, i) => (
          <button
            key={item.label}
            type="button"
            onClick={() => setActive(i)}
            className={cn(
              "shrink-0 rounded-full px-5 py-2.5 text-left text-sm font-semibold transition-colors",
              active === i ? "bg-forest text-cream" : "bg-forest/5 text-forest hover:bg-forest/10"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="relative h-[320px] overflow-hidden rounded-3xl border border-forest/10 [perspective:900px] md:h-[360px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.label}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <TiltPanel variant={current.variant} label={current.label} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
