import { AnimatePresence, motion } from "framer-motion";

// Per-letter 3D fold reveal — each glyph is a hinged panel rotating in on
// the X axis (transform-origin pinned to its base) rather than fading or
// sliding, so a word reads as folding through space rather than appearing.
// Whole words swap via AnimatePresence(mode="wait"): the old word fully
// folds away before the next one folds in, never a crossfade.

const EASE_IN = [0.16, 1, 0.3, 1]; // fast start, controlled deceleration, confident settle
const EASE_OUT = [0.7, 0, 0.84, 0]; // quick, no bounce

const letterVariants = {
  hidden: { rotateX: -100, opacity: 0, y: "0.15em" },
  visible: (i) => ({
    rotateX: 0,
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE_IN, delay: i * 0.035 },
  }),
  exit: (i) => ({
    rotateX: 100,
    opacity: 0,
    y: "-0.1em",
    transition: { duration: 0.32, ease: EASE_OUT, delay: i * 0.015 },
  }),
};

export default function FoldWord({ word, className = "", reduceMotion = false }) {
  if (reduceMotion) {
    return (
      <AnimatePresence mode="wait">
        <motion.span
          key={word}
          className={className}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {word}
        </motion.span>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={word}
        className={`inline-block whitespace-nowrap [perspective:1000px] ${className}`}
      >
        {[...word].map((char, i) => (
          <motion.span
            key={`${word}-${i}`}
            custom={i}
            variants={letterVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="inline-block [transform-style:preserve-3d]"
            style={{ transformOrigin: "50% 100%" }}
          >
            {char === " " ? " " : char}
          </motion.span>
        ))}
      </motion.span>
    </AnimatePresence>
  );
}
