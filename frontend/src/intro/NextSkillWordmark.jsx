import { motion } from "framer-motion";

// The one composition this whole intro exists to deliver: NEXTSKILL as a
// single continuous word, one line, never split into "NEXT"/"SKILL" as
// separate elements. Two letters (N, S) get an alternate-glyph treatment —
// a real typographic detail (an outlined edge, a curved stroke), not a
// color swap and not an icon substitution.

const EASE_IN = [0.16, 1, 0.3, 1];
const EASE_OUT = [0.7, 0, 0.84, 0];

const WORD = "NEXTSKILL";
const SPECIAL = { 0: "n", 4: "s" }; // N in NEXT, S in SKILL

const letterVariants = {
  hidden: { rotateX: -110, opacity: 0, y: "0.18em" },
  visible: (i) => ({
    rotateX: 0,
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: EASE_IN, delay: i * 0.045 },
  }),
  exit: (i) => ({
    rotateX: 110,
    opacity: 0,
    y: "-0.12em",
    transition: { duration: 0.36, ease: EASE_OUT, delay: i * 0.02 },
  }),
};

// The special letters fold on the same hinge but pick up a touch of
// rotateY and a hairline scale beat — enough to feel like a distinct
// mechanism without breaking the sense that this is one word entering.
const specialLetterVariants = {
  hidden: { rotateX: -110, rotateY: -18, opacity: 0, y: "0.18em", scale: 0.92 },
  visible: (i) => ({
    rotateX: 0,
    rotateY: 0,
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.7, ease: EASE_IN, delay: i * 0.045 },
  }),
  exit: (i) => ({
    rotateX: 110,
    rotateY: 14,
    opacity: 0,
    y: "-0.12em",
    scale: 0.94,
    transition: { duration: 0.36, ease: EASE_OUT, delay: i * 0.02 },
  }),
};

function SpecialN({ animate }) {
  // The glyph itself stays 100% cream, untouched — the accent is a thin
  // lime stroke that echoes and extends the N's own diagonal, added on
  // top rather than recoloring anything. A text-stroke duplicate was
  // tried first and read as "N, but lime" (exactly what was ruled out);
  // an extension of the existing stroke reads as a structural detail.
  return (
    <span className="relative inline-block">
      N
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute left-[9%] top-[16%] h-[40%] w-[4px] origin-top bg-lime"
        style={{ transform: "rotate(20deg)" }}
        initial={{ scaleY: 0, opacity: 0 }}
        animate={animate ? { scaleY: 1, opacity: 1 } : undefined}
        transition={{ duration: 0.4, delay: 0.32, ease: "easeOut" }}
      />
    </span>
  );
}

function SpecialS({ animate }) {
  return (
    <span className="relative inline-block">
      S
      {/* A thin curved stroke intersecting the glyph — the "custom alternate
          glyph" detail called for, kept as a structural accent rather than
          a replacement icon. */}
      <motion.svg
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-[18%] top-[28%] h-[42%]"
        viewBox="0 0 140 100"
        preserveAspectRatio="none"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={animate ? { pathLength: 1, opacity: 0.9 } : undefined}
        transition={{ duration: 0.55, delay: 0.36, ease: "easeOut" }}
      >
        {/* Traces the S's own spine, extended past both ends — reads as
            the letter's curve continuing, not a shape laid over it. */}
        <motion.path
          d="M115 10 C 65 -8, 10 10, 25 38 C 40 66, 100 50, 115 78 C 125 96, 75 108, 25 90"
          stroke="var(--color-secondary)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </motion.svg>
    </span>
  );
}

export default function NextSkillWordmark({ phase, reduceMotion = false, className = "" }) {
  // phase: "idle" (not yet entered) | "enter" (folding in / holding) | "exit" (folding away)
  const visible = phase === "enter";
  const animateTarget = phase === "exit" ? "exit" : phase === "enter" ? "visible" : "hidden";

  if (reduceMotion) {
    return (
      <span
        className={`inline-block whitespace-nowrap transition-opacity duration-300 ${className}`}
        style={{ opacity: visible ? 1 : 0 }}
      >
        {WORD}
      </span>
    );
  }

  return (
    <span className={`inline-block whitespace-nowrap [perspective:1200px] ${className}`}>
      {[...WORD].map((char, i) => {
        const special = SPECIAL[i];
        const variants = special ? specialLetterVariants : letterVariants;
        return (
          <motion.span
            key={i}
            custom={i}
            variants={variants}
            initial="hidden"
            animate={animateTarget}
            className="inline-block [transform-style:preserve-3d]"
            style={{ transformOrigin: "50% 100%" }}
          >
            {special === "n" ? (
              <SpecialN animate={visible} />
            ) : special === "s" ? (
              <SpecialS animate={visible} />
            ) : (
              char
            )}
          </motion.span>
        );
      })}
    </span>
  );
}
