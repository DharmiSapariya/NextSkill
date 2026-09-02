import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "../lib/cn";

function NodeCard({ item }) {
  const [hovered, setHovered] = useState(false);
  const Icon = item.icon;
  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ scale: 1.05, y: -3 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 420, damping: 24 }}
      style={{
        borderColor: hovered ? item.color : "rgba(20,38,28,0.1)",
        boxShadow: hovered
          ? `0 10px 24px -10px ${item.color}`
          : "0 2px 10px -4px rgba(20,38,28,0.25)",
      }}
      className="flex cursor-default items-center gap-2.5 rounded-full border bg-cream px-4 py-2.5 transition-colors duration-200"
    >
      <Icon className="h-4 w-4 shrink-0" style={{ color: item.color }} />
      <span className="whitespace-nowrap text-sm font-semibold text-forest">{item.label}</span>
    </motion.div>
  );
}

function FlowDot({ color }) {
  return (
    <>
      <motion.span
        aria-hidden="true"
        className="absolute left-0 top-1/2 hidden h-1.5 w-1.5 -translate-y-1/2 rounded-full md:block"
        style={{ background: color }}
        animate={{ left: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.span
        aria-hidden="true"
        className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full md:hidden"
        style={{ background: color }}
        animate={{ top: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
    </>
  );
}

function Connector({ color }) {
  return (
    <div className="relative h-10 w-px shrink-0 bg-gradient-to-b from-transparent via-forest/20 to-transparent md:h-px md:w-12 md:bg-gradient-to-r">
      <FlowDot color={color} />
    </div>
  );
}

const engineFacts = [
  "Re-reads live postings continuously",
  "Every recommendation cites its source",
];

// Replaces the earlier 3D-orbit SolarSystem visual, which rendered as an
// unreadable jumble of floating pills — a plain sources -> engine -> output
// flow says the same thing ("one engine reads many sources, you get one
// report") far more clearly, with hover feedback on each node and a
// looping flow dot on the connectors standing in for the orbit's motion.
export default function PipelineFlow({ sources, outputs, className }) {
  const [engineHovered, setEngineHovered] = useState(false);

  return (
    <div
      className={cn(
        "mx-auto flex max-w-3xl flex-col items-center gap-6 md:flex-row md:justify-center",
        className
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <span className="font-kicker text-xs uppercase tracking-widest text-forest/45">Sources</span>
        <div className="flex flex-col gap-3">
          {sources.map((item) => (
            <NodeCard key={item.id} item={item} />
          ))}
        </div>
      </div>

      <Connector color="var(--lime)" />

      <div className="relative flex flex-col items-center gap-3">
        <motion.div
          onHoverStart={() => setEngineHovered(true)}
          onHoverEnd={() => setEngineHovered(false)}
          whileHover={{ scale: 1.08 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="relative flex h-16 w-16 cursor-default items-center justify-center rounded-full border-2 border-lime/60 bg-forest shadow-[0_0_30px_rgba(239,248,122,0.35)]"
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-lime/20" />
          <span className="relative font-display text-base font-bold text-cream">NS</span>
        </motion.div>
        <span className="font-kicker text-xs uppercase tracking-widest text-forest/45">Engine</span>

        <AnimatePresence>
          {engineHovered && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute top-[calc(100%+1.75rem)] z-20 w-48 rounded-xl border border-forest/10 bg-forest px-3.5 py-3 text-center shadow-[0_16px_32px_-12px_rgba(20,38,28,0.45)]"
            >
              <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-forest" />
              <ul className="space-y-1 text-xs font-medium leading-snug text-cream-on-dark/85">
                {engineFacts.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Connector color="var(--periwinkle)" />

      <div className="flex flex-col items-center gap-3">
        <span className="font-kicker text-xs uppercase tracking-widest text-forest/45">Output</span>
        <div className="flex flex-col gap-3">
          {outputs.map((item) => (
            <NodeCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
