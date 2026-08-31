import { useLayoutEffect, useMemo, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

// A thick lime line that starts touching a box (the hero's dashboard
// mock) and winds its way down the full page to the footer, drawing in
// as the user scrolls the whole site rather than one section.
function buildWavyPath(startX, startY, endY, width) {
  const height = endY - startY;
  const segments = Math.max(5, Math.round(height / 450));
  const points = [{ x: startX, y: startY }];
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const y = startY + t * height;
    const x = i === segments ? width * 0.5 : width * (i % 2 === 0 ? 0.6 : 0.4);
    points.push({ x, y });
  }

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midY = (prev.y + curr.y) / 2;
    d += ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`;
  }
  return d;
}

export default function SiteConnector({ containerRef, startRef, endRef, className, strokeWidth = 16 }) {
  const [geo, setGeo] = useState(null);

  useLayoutEffect(() => {
    const measure = () => {
      if (!containerRef.current || !startRef.current) return;
      const c = containerRef.current.getBoundingClientRect();
      const s = startRef.current.getBoundingClientRect();
      const endY = endRef?.current
        ? endRef.current.getBoundingClientRect().top - c.top
        : c.height - 160;
      setGeo({
        startX: s.left + s.width / 2 - c.left,
        startY: s.bottom - c.top,
        endY,
        width: c.width,
      });
    };
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [containerRef, startRef, endRef]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 60%", "end 90%"],
  });
  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);

  const d = useMemo(() => {
    if (!geo) return "";
    return buildWavyPath(geo.startX, geo.startY, geo.endY, geo.width);
  }, [geo]);

  if (!geo) return null;

  return (
    <svg className={className} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <motion.path
        d={d}
        fill="none"
        stroke="var(--lime)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        style={{ pathLength }}
      />
    </svg>
  );
}
