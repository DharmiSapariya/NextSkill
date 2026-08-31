import { useEffect, useRef } from "react";
import { annotate } from "rough-notation";

// The spec's Highlighter component wraps rough-notation's hand-drawn
// annotation strokes (underline/circle/highlight/box/etc). isView gates
// the draw-in to when the element actually scrolls into view, rather
// than firing on mount.
export default function Highlighter({
  children,
  action = "highlight",
  color = "var(--lime)",
  strokeWidth = 2.5,
  animationDuration = 500,
  iterations = 1,
  padding = 7,
  multiline = true,
  isView = false,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const annotation = annotate(el, {
      type: action,
      color,
      strokeWidth,
      animationDuration: reduceMotion ? 1 : animationDuration,
      iterations,
      padding,
      multiline,
    });

    if (!isView) {
      annotation.show();
      return () => annotation.remove();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          annotation.show();
          observer.disconnect();
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      annotation.remove();
    };
  }, [action, color, strokeWidth, animationDuration, iterations, padding, multiline, isView]);

  return (
    <span ref={ref} className="relative inline-block">
      {children}
    </span>
  );
}
