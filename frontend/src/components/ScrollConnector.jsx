import { useLayoutEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

// A simple scroll-drawn line connecting two DOM points (e.g. a CTA button
// to the next section's headline), instead of the decorative Skiper19
// stroke. Positions are measured live so it holds up across breakpoints.
export default function ScrollConnector({ containerRef, startRef, endRef, className }) {
  const [box, setBox] = useState(null);

  useLayoutEffect(() => {
    const measure = () => {
      if (!containerRef.current || !startRef.current || !endRef.current) return;
      const c = containerRef.current.getBoundingClientRect();
      const s = startRef.current.getBoundingClientRect();
      const e = endRef.current.getBoundingClientRect();
      setBox({
        x1: s.left + s.width / 2 - c.left,
        y1: s.bottom - c.top,
        x2: e.left + e.width / 2 - c.left,
        y2: e.top - c.top,
      });
    };
    // Sibling refs (CTA button, next section's headline) can still be
    // unattached on this exact layout-effect tick, so defer one frame
    // rather than assume commit order across sibling components.
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [containerRef, startRef, endRef]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 55%", "end 55%"],
  });
  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);

  if (!box) return null;

  const midY = (box.y1 + box.y2) / 2;
  const d = `M ${box.x1} ${box.y1} C ${box.x1} ${midY}, ${box.x2} ${midY}, ${box.x2} ${box.y2}`;

  return (
    <svg className={className} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <motion.path
        d={d}
        fill="none"
        stroke="var(--lime)"
        strokeWidth="3"
        strokeLinecap="round"
        style={{ pathLength }}
      />
    </svg>
  );
}
