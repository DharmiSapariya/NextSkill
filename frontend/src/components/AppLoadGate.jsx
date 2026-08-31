import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Loader from "./Loader";

const MIN_VISIBLE_MS = 600;

// Mounts once on initial load only (not on route/section transitions).
// Waits for the real page to be ready (fonts + first paint) but never
// dismisses before MIN_VISIBLE_MS, so it never flashes.
export default function AppLoadGate({ children }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const start = Date.now();
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();

    fontsReady.then(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
      setTimeout(() => setReady(true), remaining);
    });
  }, []);

  return (
    <>
      <AnimatePresence>
        {!ready && (
          <motion.div
            key="loader"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[--cream]"
          >
            <Loader />
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </>
  );
}
