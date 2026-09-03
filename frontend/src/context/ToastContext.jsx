import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const TONES = {
  success: { icon: CheckCircle2, bg: "bg-lime/90", text: "text-forest", iconColor: "text-forest" },
  error: { icon: XCircle, bg: "bg-red-600", text: "text-white", iconColor: "text-white" },
  info: { icon: Info, bg: "bg-periwinkle/95", text: "text-forest", iconColor: "text-forest" },
};

const DEFAULT_DURATION = 3200;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, tone = "info", duration = DEFAULT_DURATION) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, tone }].slice(-4));
      if (duration > 0) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const api = useRef({
    push,
    success: (message, duration) => push(message, "success", duration),
    error: (message, duration) => push(message, "error", duration),
    info: (message, duration) => push(message, "info", duration),
    dismiss,
  }).current;

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 px-4 pb-6 sm:items-end sm:pr-6">
        <AnimatePresence>
          {toasts.map((t) => {
            const tone = TONES[t.tone] || TONES.info;
            const Icon = tone.icon;
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96, transition: { duration: 0.15 } }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-2xl px-4 py-3 shadow-[0_16px_36px_-14px_rgba(20,38,28,0.45)] ${tone.bg} ${tone.text}`}
              >
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone.iconColor}`} />
                <p className="flex-1 text-sm font-medium leading-snug">{t.message}</p>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  className="shrink-0 opacity-60 transition-opacity hover:opacity-100"
                  aria-label="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
