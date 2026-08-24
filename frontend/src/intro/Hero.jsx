import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import NextSkillWordmark from "./NextSkillWordmark";

// The NEXTSKILL entrance — now the landing page's own hero section, not a
// full-screen gate in front of the whole app. It plays once on mount (page
// load, or navigating back to "/"), then stays in place as the page's top
// section. There's no auto-complete/fade-away any more: scrolling past it,
// like any other hero, is what reveals the rest of the landing page.

const TIMELINE = {
  labelOn: 100,
  wordmarkEnter: 250,
};

export default function Hero() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [labelOn, setLabelOn] = useState(false);
  const [wordmarkPhase, setWordmarkPhase] = useState("idle");
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
    schedule(TIMELINE.labelOn, () => setLabelOn(true));
    schedule(TIMELINE.wordmarkEnter, () => setWordmarkPhase("enter"));
    return () => timeouts.current.forEach(clearTimeout);
  }, []);

  return (
    <section className="relative flex h-screen w-full flex-col justify-between overflow-hidden bg-forest py-6 sm:py-8">
      {/* top row: tiny wordmark label (left) + entry index (right) — the
          only rows with side padding, so the hero word below is free to
          run almost edge-to-edge, the way a wordmark on its own poster
          would, rather than sitting inside a centered card. */}
      <div className="flex items-start justify-between px-6 sm:px-10 font-sans text-[10px] uppercase tracking-[0.25em] text-cream/70">
        <motion.div animate={{ opacity: labelOn ? 1 : 0 }} transition={{ duration: 0.4 }}>
          NextSkill
          <br />
          Career Intelligence
        </motion.div>
        <motion.div animate={{ opacity: labelOn ? 1 : 0 }} transition={{ duration: 0.4 }}>
          Entry / 01
        </motion.div>
      </div>

      {/* hero: NEXTSKILL. px-2/sm:px-4 here is a hairline safety margin
          (glyph antialiasing), not a card inset — the word itself is sized
          to nearly fill this row; NextSkillWordmark's own fit-to-width
          guard (see that file) is what actually guarantees it never wraps
          at any viewport. */}
      <div className="flex flex-1 flex-col items-center justify-center px-2 text-center sm:px-4">
        <NextSkillWordmark
          phase={wordmarkPhase}
          reduceMotion={reduceMotion}
          className="font-display text-cream [font-size:clamp(3.5rem,21vw,19rem)] leading-none [letter-spacing:0.03em]"
        />
      </div>

      {/* bottom row: tiny status metadata */}
      <div className="flex items-end justify-between px-6 sm:px-10 font-sans text-[10px] uppercase tracking-[0.25em] text-cream/60">
        <motion.div animate={{ opacity: labelOn ? 1 : 0 }} transition={{ duration: 0.4 }}>
          Career intelligence OS
        </motion.div>
        <motion.div
          className="flex items-center gap-2"
          animate={{ opacity: labelOn ? 1 : 0 }}
          transition={{ duration: 0.4 }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-lime" />
          Scroll to explore
        </motion.div>
      </div>
    </section>
  );
}
