import { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import NextSkillLogo from "../components/NextSkillLogo";
import { IntroContext } from "../lib/IntroContext";

// NEXTSKILL must never wrap to a second line at any width this fits at —
// shrinks the fold text's own font size (not just the container) once the
// word would overflow, since only the glyphs themselves reading smaller
// keeps the fold-in hinge math (which is per-character) looking right.
function useFitToWidth() {
  const ref = useRef(null);
  const [overridePx, setOverridePx] = useState(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return undefined;

    const fit = () => {
      const textEl = el.querySelector(".fold-text") || el;
      const available = parent.clientWidth;
      const natural = textEl.scrollWidth;
      if (available > 0 && natural > available) {
        const computed = parseFloat(getComputedStyle(textEl).fontSize);
        setOverridePx(Math.max(computed * (available / natural) * 0.97, 24));
      } else {
        setOverridePx(null);
      }
    };

    fit();
    const settleCheck = setTimeout(fit, 900);
    const ro = new ResizeObserver(fit);
    ro.observe(parent);
    return () => {
      clearTimeout(settleCheck);
      ro.disconnect();
    };
  }, []);

  return [ref, overridePx];
}

// Total time the fold-in animation itself takes to finish (last letter's
// stagger delay + its own duration), plus a short hold so the completed
// word is actually readable for a beat before it shrinks into the nav.
const FOLD_DURATION = 0.9;
const FOLD_STAGGER = 0.09;
const LETTER_COUNT = 9; // "NEXTSKILL"
const HOLD_MS = 550;
const DISMISS_MS = (FOLD_DURATION + (LETTER_COUNT - 1) * FOLD_STAGGER) * 1000 + HOLD_MS;

// The landing page's first in-flow section. The NEXTSKILL wordmark folds
// itself in here, holds for a beat, then shrinks into the nav's corner
// spot via a shared framer-motion layoutId (see Layout.jsx) — but unlike
// the old full-screen intro overlay this replaced, the nav, its links, and
// the rest of the page are all live and scrollable the entire time; only
// the wordmark itself is mid-transition.
export default function Hero() {
  const { introDone, setIntroDone } = useContext(IntroContext);
  const [fitRef, overridePx] = useFitToWidth();

  useEffect(() => {
    if (introDone) return undefined;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(() => setIntroDone(true), reduceMotion ? 400 : DISMISS_MS);
    return () => clearTimeout(timer);
  }, [introDone, setIntroDone]);

  return (
    <motion.section
      initial={false}
      animate={{ height: introDone ? "0vh" : "100vh" }}
      transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1], delay: introDone ? 0.2 : 0 }}
      className="flex w-full flex-col justify-center overflow-hidden bg-forest px-6 pb-6 sm:px-10 sm:pb-8"
    >
      <motion.div
        animate={{ opacity: introDone ? 0 : 1 }}
        transition={{ duration: 0.25 }}
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center text-center"
      >
        {!introDone && (
          <span ref={fitRef} className="inline-block max-w-full">
            <motion.span layoutId="nextskill-logo" className="inline-block">
              <NextSkillLogo
                trigger="mount"
                fontSize="clamp(3.5rem, 21vw, 19rem)"
                style={overridePx ? { "--fold-text-font-size": `${overridePx}px` } : undefined}
              />
            </motion.span>
          </span>
        )}
        <p className="mt-6 max-w-md font-sans text-sm uppercase tracking-[0.25em] text-cream/60">Career intelligence OS</p>
      </motion.div>
      <motion.div
        animate={{ opacity: introDone ? 0 : 1 }}
        transition={{ duration: 0.25 }}
        className="flex items-center justify-end font-sans text-[10px] uppercase tracking-[0.25em] text-cream/60"
      >
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-lime" />
          Scroll to explore
        </span>
      </motion.div>
    </motion.section>
  );
}
