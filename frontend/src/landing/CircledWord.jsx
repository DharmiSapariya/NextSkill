import { motion } from "framer-motion";

// A hand-drawn ellipse that draws itself around a word, the same
// typographic-annotation move as the "effortless" circle in the
// HeyFriends reference — one wobbly, not-quite-closed stroke, not a
// perfect CSS border. Sized in a fixed viewBox stretched over the word's
// actual rendered box, so it works at any width without redrawing the path.
export default function CircledWord({ children, color = "var(--color-secondary)" }) {
  return (
    <span className="relative inline-block whitespace-nowrap px-1">
      {children}
      <svg
        className="pointer-events-none absolute -inset-x-2 -inset-y-2 h-[calc(100%+1rem)] w-[calc(100%+1rem)]"
        viewBox="0 0 220 100"
        preserveAspectRatio="none"
        fill="none"
        aria-hidden="true"
      >
        <motion.path
          d="M28,52 C22,20 90,6 130,8 C182,11 202,32 196,54 C190,80 130,94 78,90 C36,87 14,70 24,50"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true, amount: 0.8 }}
          transition={{ duration: 0.7, delay: 0.5, ease: "easeInOut" }}
        />
      </svg>
    </span>
  );
}
