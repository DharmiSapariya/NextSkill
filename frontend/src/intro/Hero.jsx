import { motion } from "framer-motion";
import NextSkillLogo from "../components/NextSkillLogo";

// The landing page's first in-flow section — a plain forest backdrop with
// the wordmark sitting in place from first paint (a quick fade/rise, not
// a full-screen gate the visitor has to sit through before seeing the
// nav or any content).
export default function Hero() {
  return (
    <section className="flex h-screen w-full flex-col justify-center bg-forest px-6 pb-6 sm:px-10 sm:pb-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center text-center"
      >
        <NextSkillLogo trigger="static" fontSize="clamp(3.5rem, 12vw, 8rem)" fontWeight={600} />
        <p className="mt-6 max-w-md font-sans text-sm uppercase tracking-[0.25em] text-cream/60">Career intelligence OS</p>
      </motion.div>
      <div className="flex items-center justify-end font-sans text-[10px] uppercase tracking-[0.25em] text-cream/60">
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-lime" />
          Scroll to explore
        </span>
      </div>
    </section>
  );
}
