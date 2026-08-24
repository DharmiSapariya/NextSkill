import { AnimatePresence, motion } from "framer-motion";

// Per-letter 3D fold reveal — each glyph is a hinged panel rotating in on
// the X axis (transform-origin pinned to its base) rather than fading or
// sliding, so a word reads as folding through space rather than appearing.
// Whole words swap via AnimatePresence(mode="wait"): the old word fully
// folds away before the next one folds in, never a crossfade.
//
// `word` may be "", null, or undefined — that's the "nothing showing"
// state, and it's a real value the AnimatePresence key cycles through,
// not a case the parent bails out of rendering for. If the parent instead
// conditionally unmounted this component when it had nothing to show, the
// very last word on screen would vanish instantly with no exit fold —
// unmounting a component skips AnimatePresence's exit lifecycle unless
// something above it is also wrapped in AnimatePresence. Always rendering
// FoldWord and just varying `word` sidesteps that: every transition,
// including the last one, plays the same fold-away.

const EASE_IN = [0.16, 1, 0.3, 1]; // fast start, controlled deceleration, confident settle
const EASE_OUT = [0.7, 0, 0.84, 0]; // quick, no bounce

const LETTER_DURATION_IN = 0.45;
const LETTER_DURATION_OUT = 0.3;
// Total stagger spread is capped regardless of word length, so a longer
// concept word doesn't eat more of the timeline than a short one — every
// word reads as "about the same beat," just with more letters in it.
const MAX_SPREAD_IN = 0.16;
const MAX_SPREAD_OUT = 0.08;

function buildLetterVariants(letterCount) {
  const stepIn = letterCount > 1 ? MAX_SPREAD_IN / (letterCount - 1) : 0;
  const stepOut = letterCount > 1 ? MAX_SPREAD_OUT / (letterCount - 1) : 0;
  return {
    hidden: { rotateX: -100, opacity: 0, y: "0.15em" },
    visible: (i) => ({
      rotateX: 0,
      opacity: 1,
      y: 0,
      transition: { duration: LETTER_DURATION_IN, ease: EASE_IN, delay: i * stepIn },
    }),
    exit: (i) => ({
      rotateX: 100,
      opacity: 0,
      y: "-0.1em",
      transition: { duration: LETTER_DURATION_OUT, ease: EASE_OUT, delay: i * stepOut },
    }),
  };
}

export default function FoldWord({ word, className = "", reduceMotion = false }) {
  const safeWord = word || "";

  if (reduceMotion) {
    return (
      <AnimatePresence mode="wait">
        <motion.span
          key={safeWord}
          className={className}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {safeWord}
        </motion.span>
      </AnimatePresence>
    );
  }

  const letters = [...safeWord];
  const variants = buildLetterVariants(letters.length);

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={safeWord}
        className={`inline-block whitespace-nowrap [perspective:1000px] ${className}`}
      >
        {letters.map((char, i) => (
          <motion.span
            key={`${safeWord}-${i}`}
            custom={i}
            variants={variants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="inline-block [transform-style:preserve-3d]"
            style={{ transformOrigin: "50% 100%" }}
          >
            {char === " " ? " " : char}
          </motion.span>
        ))}
      </motion.span>
    </AnimatePresence>
  );
}
