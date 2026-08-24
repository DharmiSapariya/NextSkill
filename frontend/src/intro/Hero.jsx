import { useLayoutEffect, useRef, useState } from "react";
import FoldText from "../components/FoldText";

// NEXTSKILL must never wrap to a second line — outranks the font-size
// clamp below, which only picks an *ideal* size per viewport. This measures
// the rendered word against its container after mount and dials the
// font-size down (never up past the clamp's own value) only if it
// overflows. Re-checks on resize and once more shortly after mount to
// correct for the fold-in animation's transient scale/rotation making the
// very first measurement optimistic.
function useFitToWidth() {
  const ref = useRef(null);
  const [overridePx, setOverridePx] = useState(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return undefined;

    // FoldText sets its own font-size inline on its own root (.fold-text),
    // not on this wrapper, so the computed value has to come from that
    // child — reading it off the wrapper would return an inherited
    // ancestor font-size instead of the clamp() value actually in use.
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

// The NEXTSKILL entrance, rebuilt on GSAP FoldText (see components/FoldText)
// instead of the earlier Framer Motion rotateX build — a real hinge-fold,
// letters rising from below (hinge="bottom") rather than pitching forward,
// closer to the "letters fly upward" reference. Still one continuous word,
// still never split into "NEXT"/"SKILL" as separate elements, still plays
// once on mount as the landing page's own hero (not a full-screen gate).

const SPECIAL = { 0: "n", 4: "s" }; // N in NEXT, S in SKILL

function renderNextSkillChar(char, index) {
  const special = SPECIAL[index];
  if (special === "n") {
    // Hollow — lime outline only, no fill — traced along the glyph's own
    // edge via text-stroke, so it can't drift out of alignment with the
    // real glyph the way a separately positioned overlay did in earlier
    // attempts (font hinting sizes a box differently than the visible ink).
    return (
      <span className="text-lime" style={{ WebkitTextStroke: "0.012em var(--color-accent)", color: "transparent" }}>
        N
      </span>
    );
  }
  if (special === "s") {
    return (
      <span
        className="text-periwinkle"
        style={{ WebkitTextStroke: "0.014em var(--color-secondary)", color: "transparent" }}
      >
        S
      </span>
    );
  }
  return char;
}

export default function Hero() {
  const [fitRef, overridePx] = useFitToWidth();

  return (
    <section className="relative flex h-screen w-full flex-col justify-end overflow-hidden bg-forest pb-6 sm:pb-8">
      <div className="flex flex-1 flex-col items-center justify-center px-2 text-center sm:px-4">
        <span ref={fitRef} className="inline-block max-w-full">
          <FoldText
            text="NEXTSKILL"
            splitBy="char"
            hinge="bottom"
            trigger="mount"
            duration={0.9}
            stagger={0.09}
            ease="power3.out"
            creaseShading={0.6}
            perspective={900}
            color="var(--color-background)"
            fontSize="clamp(3.5rem, 21vw, 19rem)"
            fontWeight={600}
            renderChar={renderNextSkillChar}
            className="font-display [letter-spacing:0.03em]"
            style={{
              whiteSpace: "nowrap",
              ...(overridePx ? { "--fold-text-font-size": `${overridePx}px` } : null),
            }}
          />
        </span>
      </div>

      {/* bottom row: tiny status metadata */}
      <div className="flex items-end justify-between px-6 sm:px-10 font-sans text-[10px] uppercase tracking-[0.25em] text-cream/60">
        <span>Career intelligence OS</span>
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-lime" />
          Scroll to explore
        </span>
      </div>
    </section>
  );
}
