import { useEffect, useRef } from "react";

// A small lagging dot + ring that replaces the system cursor on the
// landing page only (desktop, fine-pointer devices — touch screens never
// mount this). The ring eases toward the pointer every frame while the
// dot tracks it exactly, and both grow/relabel when hovering anything
// carrying data-cursor="<label>" so links, cards and the nav all get a
// tactile "this is clickable" cue instead of a plain arrow.
export default function ScrollCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const labelRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const isFinePointer = window.matchMedia?.("(pointer: fine)").matches;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!isFinePointer || reduceMotion) return undefined;

    document.documentElement.classList.add("custom-cursor-active");

    const dot = dotRef.current;
    const ring = ringRef.current;
    const label = labelRef.current;
    if (!dot || !ring || !label) return undefined;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let visible = false;
    let rafId;

    const onMove = (event) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
      if (!visible) {
        visible = true;
        dot.style.opacity = "1";
        ring.style.opacity = "1";
      }
      dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
    };

    const onLeave = () => {
      visible = false;
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    };

    const findTarget = (event) => event.target.closest("[data-cursor]");

    const onOver = (event) => {
      const target = findTarget(event);
      if (!target) return;
      const mode = target.getAttribute("data-cursor") || "";
      ring.dataset.mode = mode;
      label.textContent = mode !== "view" && mode !== "drag" ? "" : mode === "drag" ? "DRAG" : "VIEW";
    };

    const onOut = (event) => {
      const target = findTarget(event);
      if (!target) return;
      const related = event.relatedTarget;
      if (related && target.contains(related)) return;
      ring.dataset.mode = "";
      label.textContent = "";
    };

    const tick = () => {
      ringX += (mouseX - ringX) * 0.16;
      ringY += (mouseY - ringY) * 0.16;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
      rafId = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onOver);
    window.addEventListener("mouseout", onOut);
    document.addEventListener("mouseleave", onLeave);
    rafId = requestAnimationFrame(tick);

    return () => {
      document.documentElement.classList.remove("custom-cursor-active");
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      window.removeEventListener("mouseout", onOut);
      document.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] hidden [.custom-cursor-active_&]:block">
      <div
        ref={dotRef}
        className="fixed left-0 top-0 h-1.5 w-1.5 rounded-full bg-lime opacity-0 transition-opacity duration-150"
      />
      <div
        ref={ringRef}
        data-mode=""
        className="fixed left-0 top-0 flex h-11 w-11 items-center justify-center rounded-full border border-cream/60 opacity-0 transition-[width,height,opacity,background-color] duration-200 ease-out data-[mode=view]:h-16 data-[mode=view]:w-16 data-[mode=view]:border-transparent data-[mode=view]:bg-lime/90 data-[mode=drag]:h-16 data-[mode=drag]:w-16 data-[mode=drag]:border-transparent data-[mode=drag]:bg-periwinkle/90"
      >
        <span
          ref={labelRef}
          className="text-[9px] font-semibold uppercase tracking-[0.2em] text-forest"
        />
      </div>
    </div>
  );
}
