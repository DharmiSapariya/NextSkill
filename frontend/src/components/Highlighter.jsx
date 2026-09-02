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
  strokeWidth = 3,
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
  const resolvedPadding = padding ?? (action === "circle" ? 20 : 7);

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
    const timers = [];

    // rough-notation's own show() is smart about this: called on an
    // annotation that isn't showing yet, it plays the draw-in animation;
    // called again on one that's already showing, it silently snaps to
    // the current position with no animation at all. So a short, FINITE
    // burst of re-calls right after the first reveal corrects any drift
    // from late layout settling (fonts, images) with nothing visibly
    // moving. This deliberately does NOT keep watching forever — a
    // permanent observer on the page (things like the hero's looping
    // typed text never stop triggering reflow) would mean every stroke
    // on the page re-snaps on every keystroke of that animation, which
    // reads as constant jitter. Once, shortly after mount, is enough.
    const reposition = () => {
      if (!cancelled) annotation.show();
    };

    const readyPromise = document.fonts ? document.fonts.ready : Promise.resolve();
    const armShow = () => {
      readyPromise.then(() => {
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (cancelled) return;
          reposition();
          [150, 400, 800, 1500].forEach((delay) => {
            timers.push(setTimeout(reposition, delay));
          });
        }));
      });
    };

    let resizeTimer = null;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(reposition, 150);
    };
    window.addEventListener("resize", onResize);

    const cleanupCommon = () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      annotation.remove();
    };

    if (!isView) {
      armShow();
      return cleanupCommon;
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
    return () => {
      observer.disconnect();
      cleanupCommon();
    };
  }, [action, color, strokeWidth, animationDuration, iterations, resolvedPadding, multiline, isView]);

  return (
    <span ref={ref} className="relative inline-block">
      {children}
    </span>
  );
}
