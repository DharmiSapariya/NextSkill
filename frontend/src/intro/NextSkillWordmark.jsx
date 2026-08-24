import { useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

// The one composition this whole intro exists to deliver: NEXTSKILL as a
// single continuous word, one line, never split into "NEXT"/"SKILL" as
// separate elements. Two letters (N, S) get an alternate-glyph treatment —
// a real typographic detail (an outlined edge), not a flat color swap and
// not an icon substitution. Both are done as text-stroke on the glyph
// itself rather than a separately positioned overlay, on purpose: an
// overlay has its own box to size and place, and that box doesn't line up
// with the font's actual ink the same way across sizes/browsers. A stroke
// traced by the browser along the real outline can't drift or overlap.

const EASE_IN = [0.16, 1, 0.3, 1];
const EASE_OUT = [0.7, 0, 0.84, 0];

const WORD = "NEXTSKILL";
const SPECIAL = { 0: "n", 4: "s" }; // N in NEXT, S in SKILL

// Two timing profiles, same fold mechanic, different tempo. "enter" is the
// first, grand arrival. "return" is the brief final-identity beat right
// before hand-off (see NextSkillIntro) — narratively the brand isn't
// arriving again, it's confidently reasserting itself, so it plays as a
// quick, tight snap rather than a repeat of the intro.
const PROFILES = {
  enter: { duration: 0.65, stepIn: 0.045, exitDuration: 0.36, stepOut: 0.02 },
  return: { duration: 0.4, stepIn: 0.02, exitDuration: 0.26, stepOut: 0.012 },
};

function buildVariants(profile, special) {
  const p = PROFILES[profile];
  const rotate = special ? 110 : 100;
  return {
    hidden: {
      rotateX: -rotate,
      rotateY: special ? -18 : 0,
      opacity: 0,
      y: "0.18em",
      scale: special ? 0.92 : 1,
    },
    visible: (i) => ({
      rotateX: 0,
      rotateY: 0,
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: p.duration, ease: EASE_IN, delay: i * p.stepIn },
    }),
    exit: (i) => ({
      rotateX: rotate,
      rotateY: special ? 14 : 0,
      opacity: 0,
      y: "-0.12em",
      scale: special ? 0.94 : 1,
      transition: { duration: p.exitDuration, ease: EASE_OUT, delay: i * p.stepOut },
    }),
  };
}

// Cream fill plus a thin lime outline traced along the glyph's own edge —
// a duotone rim, not a separate shape laid on top. (An absolutely
// positioned swash was tried first, sized and placed by percentage/em
// guesses against the letter's box. It never lined up the same way twice:
// different browsers and font hinting size that box differently than the
// glyph's visible ink, so the accent either floated off to one side or
// hung below the baseline instead of crossing the counter. Text-stroke has
// no separate box to get wrong — the browser draws it exactly on the
// glyph's actual outline, at any size, every time.) Falls back to plain
// cream in the rare browser without text-stroke support.
function SpecialN() {
  return (
    <span
      className="inline-block text-cream"
      style={{ WebkitTextStroke: "0.035em var(--color-accent)", paintOrder: "stroke fill" }}
    >
      N
    </span>
  );
}

// Rendered as an open / stroked panel instead of a solid one — its
// construction differs from its neighbors (outline vs. fill), not just its
// color, while remaining unmistakably an "S". (A hand-drawn SVG spine was
// tried first; it never lined up with the real glyph's curve at every size
// and just read as noise sitting on top of the letter. Tracing the font's
// own outline via text-stroke is what actually reads as "the S, open"
// rather than "the S, with a squiggle near it.") Falls back to a solid
// periwinkle fill in the rare browser without text-stroke support, rather
// than risking an invisible glyph.
function SpecialS() {
  return (
    <span
      className="inline-block text-periwinkle"
      style={{ WebkitTextStroke: "0.045em var(--color-secondary)", color: "transparent" }}
    >
      S
    </span>
  );
}

// NEXTSKILL must never wrap to a second line — that requirement outranks
// the caller's font-size clamp. The clamp (set by NextSkillIntro, in vw
// units) picks an *ideal* size for a given viewport; this hook is the
// backstop that actually guarantees a single line, by measuring the
// rendered word against the width it has to live in and, only if it
// overflows, dialing the font-size down (never up past the clamp's own
// value) until it fits. Re-checks on resize, and once more shortly after
// mount to correct for the entrance animation's transient scale/rotation
// making the very first measurement slightly optimistic.
function useFitToWidth() {
  const ref = useRef(null);
  const [overridePx, setOverridePx] = useState(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return undefined;

    const fit = () => {
      el.style.fontSize = ""; // re-measure against the CSS clamp's natural size
      const available = parent.clientWidth;
      const natural = el.scrollWidth;
      if (available > 0 && natural > available) {
        const computed = parseFloat(getComputedStyle(el).fontSize);
        setOverridePx(Math.max(computed * (available / natural) * 0.97, 24));
      } else {
        setOverridePx(null);
      }
    };

    fit();
    const settleCheck = setTimeout(fit, 700);
    const ro = new ResizeObserver(fit);
    ro.observe(parent);
    return () => {
      clearTimeout(settleCheck);
      ro.disconnect();
    };
  }, []);

  return [ref, overridePx];
}

export default function NextSkillWordmark({
  phase,
  reduceMotion = false,
  fast = false,
  className = "",
}) {
  // phase: "idle" (not yet entered) | "enter" (folding in / holding) | "exit" (folding away)
  const visible = phase === "enter";
  const animateTarget = phase === "exit" ? "exit" : phase === "enter" ? "visible" : "hidden";
  const profile = fast ? "return" : "enter";
  const [fitRef, fitSize] = useFitToWidth();
  const fitStyle = fitSize ? { fontSize: `${fitSize}px` } : undefined;

  if (reduceMotion) {
    // Reduced motion drops the 3D choreography but keeps the brand's
    // actual identity — the two custom glyphs stay, just static — since
    // "no fold" shouldn't also mean "no NextSkill."
    return (
      <span
        ref={fitRef}
        className={`inline-block whitespace-nowrap transition-opacity duration-300 ${className}`}
        style={{ opacity: visible ? 1 : 0, ...fitStyle }}
      >
        {[...WORD].map((char, i) =>
          SPECIAL[i] === "n" ? (
            <SpecialN key={i} />
          ) : SPECIAL[i] === "s" ? (
            <SpecialS key={i} />
          ) : (
            char
          )
        )}
      </span>
    );
  }

  return (
    <span
      ref={fitRef}
      className={`inline-block whitespace-nowrap [perspective:1200px] ${className}`}
      style={fitStyle}
    >
      {[...WORD].map((char, i) => {
        const special = SPECIAL[i];
        const variants = buildVariants(profile, Boolean(special));
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
            {special === "n" ? <SpecialN /> : special === "s" ? <SpecialS /> : char}
          </motion.span>
        );
      })}
    </span>
  );
}
