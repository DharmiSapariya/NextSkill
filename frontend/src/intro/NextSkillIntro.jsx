import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import NextSkillWordmark from "./NextSkillWordmark";
import FoldWord from "./FoldWord";

// The full entry sequence: forest field -> tiny wordmark label -> the
// NEXTSKILL hero composition folds in, holds, folds away -> a couple of
// concept words cycle through the same fold mechanic -> the whole layer
// slides up and off, revealing the app mounted underneath. One-shot,
// timeline-driven (not user-interactive) — this is a splash, not a UI.

const CONCEPT_WORDS = ["EVIDENCE", "SIGNALS"];

// Absolute millisecond offsets from mount. Hand-tuned against the actual
// per-letter fold durations in FoldWord/NextSkillWordmark, then verified
// in a real browser — see the commit message for what changed and why.
const TIMELINE = {
  labelOn: 100,
  wordmarkEnter: 250,
  wordmarkExit: 3700, // long hold after the (now slower) letter-by-letter entrance settles — "let it be there"
  wordmarkGone: 4250, // after wordmarkExit's own fold-out finishes, so it stops taking up layout space
  concept1: 4350,
  concept2: 4850,
  conceptOff: 5350,
  layerExit: 5650,
  complete: 6650, // gives the slow fade-out (see the closing motion.div) time to actually finish
};

export default function NextSkillIntro({ onComplete }) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [labelOn, setLabelOn] = useState(false);
  const [wordmarkPhase, setWordmarkPhase] = useState("idle");
  const [wordmarkVisible, setWordmarkVisible] = useState(true);
  const [conceptWord, setConceptWord] = useState(null);
  const [layerExiting, setLayerExiting] = useState(false);
  const timeouts = useRef([]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(query.matches);
    const handler = (e) => setReduceMotion(e.matches);
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const schedule = (ms, fn) => timeouts.current.push(setTimeout(fn, ms));

    if (reduceMotion) {
      // No 3D choreography — a short, simple fade sequence that still
      // completes on its own and still hands off to the app afterward.
      schedule(50, () => setLabelOn(true));
      schedule(150, () => setWordmarkPhase("enter"));
      schedule(1000, () => setWordmarkPhase("exit"));
      schedule(1250, () => setWordmarkVisible(false));
      schedule(1300, () => setLayerExiting(true));
      schedule(1700, () => onComplete?.());
      return () => timeouts.current.forEach(clearTimeout);
    }

    schedule(TIMELINE.labelOn, () => setLabelOn(true));
    schedule(TIMELINE.wordmarkEnter, () => setWordmarkPhase("enter"));
    schedule(TIMELINE.wordmarkExit, () => setWordmarkPhase("exit"));
    schedule(TIMELINE.wordmarkGone, () => setWordmarkVisible(false));
    schedule(TIMELINE.concept1, () => setConceptWord(CONCEPT_WORDS[0]));
    schedule(TIMELINE.concept2, () => setConceptWord(CONCEPT_WORDS[1]));
    schedule(TIMELINE.conceptOff, () => setConceptWord(null));
    schedule(TIMELINE.layerExit, () => setLayerExiting(true));
    schedule(TIMELINE.complete, () => onComplete?.());

    return () => timeouts.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col justify-between overflow-hidden bg-forest py-6 sm:py-8"
      animate={{ opacity: layerExiting ? 0 : 1 }}
      transition={{ duration: reduceMotion ? 0.5 : 1.2, ease: "easeInOut" }}
      style={{ pointerEvents: layerExiting ? "none" : "auto" }}
    >
      {/* top row: tiny wordmark label (left) + entry index (right) — the
          only rows with side padding, so the hero word below is free to
          run almost edge-to-edge, the way a wordmark on its own poster
          would, rather than sitting inside a centered card. */}
      <div className="flex items-start justify-between px-6 sm:px-10 font-sans text-[10px] uppercase tracking-[0.25em] text-cream/70">
        <motion.div
          animate={{ opacity: labelOn ? 1 : 0 }}
          transition={{ duration: 0.4 }}
        >
          NextSkill
          <br />
          Career Intelligence
        </motion.div>
        <motion.div animate={{ opacity: labelOn ? 1 : 0 }} transition={{ duration: 0.4 }}>
          Entry / 01
        </motion.div>
      </div>

      {/* hero: NEXTSKILL, then a couple of concept words, same fold mechanic.
          px-2/sm:px-4 here is a hairline safety margin (glyph antialiasing),
          not a card inset — the word itself is sized to nearly fill this
          row; NextSkillWordmark's own fit-to-width guard (see that file)
          is what actually guarantees it never wraps at any viewport. */}
      <div className="flex flex-1 flex-col items-center justify-center px-2 text-center sm:px-4">
        {wordmarkVisible && (
          <NextSkillWordmark
            phase={wordmarkPhase}
            reduceMotion={reduceMotion}
            className="font-display text-cream [font-size:clamp(3.5rem,21vw,19rem)] leading-none [letter-spacing:0.03em]"
          />
        )}
        {!wordmarkVisible && (
          <div className="[font-size:clamp(1.1rem,3.2vw,2.25rem)]">
            {/* Always rendered (word may be null) rather than conditionally
                mounted — see FoldWord for why: it's what lets the very
                last concept word ("SIGNALS") fold away instead of just
                vanishing when conceptWord flips back to null. */}
            <FoldWord
              word={conceptWord}
              reduceMotion={reduceMotion}
              className="font-display text-lime tracking-wide"
            />
          </div>
        )}
      </div>

      {/* bottom row: tiny status metadata */}
      <div className="flex items-end justify-between px-6 sm:px-10 font-sans text-[10px] uppercase tracking-[0.25em] text-cream/60">
        <motion.div animate={{ opacity: labelOn ? 1 : 0 }} transition={{ duration: 0.4 }}>
          Building your skill graph
        </motion.div>
        <motion.div
          className="flex items-center gap-2"
          animate={{ opacity: labelOn ? 1 : 0 }}
          transition={{ duration: 0.4 }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-lime" />
          Loading
        </motion.div>
      </div>
    </motion.div>
  );
}
