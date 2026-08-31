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
  strokeWidth = 2,
  animationDuration = 500,
  iterations = 1,
  padding,
  multiline = true,
  isView = false,
}) {
  const ref = useRef(null);
  // Circles need a generous, even halo around the word; underlines and
  // highlights sit close to the text — so the default depends on action
  // unless a caller explicitly overrides it.
  const resolvedPadding = padding ?? (action === "circle" ? 12 : 7);

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
      padding: resolvedPadding,
      multiline,
    });

    let cancelled = false;
    // rough-notation measures the target's box at draw time. If that
    // happens before the surrounding layout has fully settled (a late
    // web font swap, an image above reserving space, etc.) the stroke
    // is drawn at a stale position and never catches up on its own.
    // Waiting for fonts + a couple of frames, then redrawing once more
    // on resize, keeps it glued to the actual text.
    const draw = () => {
      if (cancelled) return;
      annotation.show();
    };
    const redraw = () => {
      if (cancelled || !annotation.isShowing()) return;
      annotation.hide();
      annotation.show();
    };

    const readyPromise = document.fonts ? document.fonts.ready : Promise.resolve();

    const armShow = () => {
      readyPromise.then(() => {
        requestAnimationFrame(() => requestAnimationFrame(draw));
      });
    };

    if (!isView) {
      armShow();
      window.addEventListener("resize", redraw);
      return () => {
        cancelled = true;
        window.removeEventListener("resize", redraw);
        annotation.remove();
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          armShow();
          observer.disconnect();
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(el);
    window.addEventListener("resize", redraw);
    return () => {
      cancelled = true;
      observer.disconnect();
      window.removeEventListener("resize", redraw);
      annotation.remove();
    };
  }, [action, color, strokeWidth, animationDuration, iterations, resolvedPadding, multiline, isView]);

  return (
    <span ref={ref} className="relative inline-block">
      {children}
    </span>
  );
}
