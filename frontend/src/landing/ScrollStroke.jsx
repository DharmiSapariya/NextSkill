import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";

// A pinned, scroll-scrubbed section: an abstract "growth line" draws
// itself as the visitor scrolls through a tall (320vh) track, while the
// headline underneath it cross-fades through four stages in step with
// how far the line has drawn. The mechanic — pathLength driven off
// scrollYProgress inside a sticky viewport — is adapted from Skiper UI's
// "Skiper 19" (skiperui.com, by @gurvinder-singh02), rebuilt here with
// NextSkill's own path, palette, and copy rather than reused verbatim.
const STAGES = [
  {
    tag: "01 — UPLOAD",
    headline: "Drop in a resume.",
    body: "No forms to fill out twice — we read what you already have.",
  },
  {
    tag: "02 — ANALYZE",
    headline: "We find the gap.",
    body: "Your skills against real job postings for the role you actually want.",
  },
  {
    tag: "03 — BRIDGE",
    headline: "You get a route.",
    body: "The shortest realistic path from here to hireable, ranked by impact.",
  },
  {
    tag: "04 — GROW",
    headline: "The market moves — so do we.",
    body: "Postings refresh constantly, so your map never goes stale.",
  },
];

const PATH_D =
  "M 40,620 C 160,560 200,700 320,640 C 440,580 420,440 560,420 " +
  "C 700,400 660,260 800,240 C 900,225 880,120 1000,90 C 1080,70 1120,60 1160,40";

export default function ScrollStroke() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });
  const pathLength = useTransform(scrollYProgress, [0.02, 0.92], [0, 1]);
  const [stageIndex, setStageIndex] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    const next = Math.min(STAGES.length - 1, Math.floor(value * STAGES.length));
    setStageIndex((current) => (current === next ? current : next));
  });

  return (
    <section ref={containerRef} className="relative h-[320vh] bg-forest">
      <div className="sticky top-0 flex h-screen w-full flex-col items-center justify-center overflow-hidden px-6">
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-90"
          viewBox="0 0 1200 700"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          <path d={PATH_D} stroke="rgba(248,244,240,0.14)" strokeWidth="3" strokeLinecap="round" />
          <motion.path
            d={PATH_D}
            stroke="#EFF87A"
            strokeWidth="4"
            strokeLinecap="round"
            style={{ pathLength }}
          />
        </svg>

        <div className="relative z-10 flex w-full max-w-3xl flex-col items-center gap-8 text-center">
          <div className="flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-[0.3em] text-periwinkle/80">
            {STAGES.map((stage, index) => (
              <span
                key={stage.tag}
                className={`h-1.5 w-6 rounded-full transition-colors duration-300 ${
                  index === stageIndex ? "bg-lime" : "bg-cream/20"
                }`}
              />
            ))}
          </div>

          <div className="relative h-[9.5rem] w-full sm:h-[8rem]">
            {STAGES.map((stage, index) => (
              <div
                key={stage.tag}
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 transition-opacity duration-500"
                style={{ opacity: index === stageIndex ? 1 : 0 }}
              >
                <span className="font-sans text-xs font-semibold tracking-[0.3em] text-lime">{stage.tag}</span>
                <h3 className="font-display text-3xl font-semibold text-cream sm:text-5xl">{stage.headline}</h3>
                <p className="max-w-md font-sans text-sm text-cream/70 sm:text-base">{stage.body}</p>
              </div>
            ))}
          </div>
        </div>

        <span className="absolute bottom-8 font-sans text-[10px] uppercase tracking-[0.3em] text-cream/40">
          Keep scrolling
        </span>
      </div>
    </section>
  );
}
