import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import NextSkillLogo from "../components/NextSkillLogo";

// NEXTSKILL must never wrap to a second line — see Hero.jsx's copy of
// this note for the full reasoning. Same hook, now targeting the intro's
// (much bigger) logo instance instead of Hero's in-flow one.
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
// word is actually readable for a beat before the whole thing dismisses.
const FOLD_DURATION = 0.9;
const FOLD_STAGGER = 0.09;
const LETTER_COUNT = 9; // "NEXTSKILL"
const HOLD_MS = 550;
const DISMISS_MS = (FOLD_DURATION + (LETTER_COUNT - 1) * FOLD_STAGGER) * 1000 + HOLD_MS;

// The obys.agency-style gate: full-screen, no nav visible behind it, the
// NEXTSKILL wordmark folds itself in once and holds — then Layout (which
// owns this component's mount) flips its `introDone` state, which is what
// actually drives the logo's shrink-into-the-corner morph via a shared
// framer-motion layoutId with the nav's own small logo. This component's
// only job is the big centered moment and telling Layout when it's over.
export default function IntroOverlay({ onDone }) {
  const [fitRef, overridePx] = useFitToWidth();

  useEffect(() => {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(onDone, reduceMotion ? 400 : DISMISS_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex h-[100dvh] w-full flex-col justify-end overflow-hidden bg-forest pb-6 sm:pb-8"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex flex-1 flex-col items-center justify-center px-2 text-center sm:px-4">
        <span ref={fitRef} className="inline-block max-w-full">
          <motion.span layoutId="nextskill-logo" className="inline-block">
            <NextSkillLogo
              trigger="mount"
              fontSize="clamp(3.5rem, 21vw, 19rem)"
              style={overridePx ? { "--fold-text-font-size": `${overridePx}px` } : undefined}
            />
          </motion.span>
        </span>
      </div>

      <div className="flex items-end justify-between px-6 sm:px-10 font-sans text-[10px] uppercase tracking-[0.25em] text-cream/60">
        <span>Career intelligence OS</span>
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-lime" />
          Scroll to explore
        </span>
      </div>
    </motion.div>
  );
}
