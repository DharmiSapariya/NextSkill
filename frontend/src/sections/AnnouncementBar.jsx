import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

const DISMISS_KEY = "nextskill:announcement-dismissed";

export default function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Private browsing / storage disabled — the bar just won't remember
      // being dismissed across a reload, which is a harmless fallback.
    }
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 36, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="relative flex w-full items-center justify-center overflow-hidden bg-forest px-10 text-center"
        >
          <p className="text-[13px] text-cream-on-dark">
            Free for individuals — every recommendation traces back to a real job posting.
          </p>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss announcement"
            className="absolute right-2 flex h-6 w-6 items-center justify-center rounded-full text-cream-on-dark/60 transition-colors hover:bg-cream-on-dark/10 hover:text-cream-on-dark"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
