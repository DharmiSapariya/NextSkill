import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

// Simplified from the spec's canvas IconCloud: a CSS 3D sphere of technology
// logos (simple-icons CDN) that auto-rotates, can be dragged, and exposes a
// showControl pause/play toggle for prefers-reduced-motion / accessibility.
function fibonacciSphere(count, radius) {
  const points = [];
  const offset = 2 / count;
  const increment = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = i * offset - 1 + offset / 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const phi = i * increment;
    points.push({
      x: Math.cos(phi) * r * radius,
      y: y * radius,
      z: Math.sin(phi) * r * radius,
    });
  }
  return points;
}

export default function IconCloud({ icons = [], radius = 130, showControl = true }) {
  const points = useMemo(() => fibonacciSphere(icons.length, radius), [icons.length, radius]);
  const reduceMotion =
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const [paused, setPaused] = useState(reduceMotion);
  const [rotation, setRotation] = useState({ x: -15, y: 0 });
  const dragRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    if (paused) return undefined;
    let last = performance.now();
    const tick = (now) => {
      const dt = now - last;
      last = now;
      setRotation((r) => ({ x: r.x, y: r.y + dt * 0.02 }));
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [paused]);

  const onPointerDown = (e) => {
    dragRef.current = { x: e.clientX, y: e.clientY, rot: rotation, wasPaused: paused };
    setPaused(true);
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setRotation({
      x: dragRef.current.rot.x - dy * 0.3,
      y: dragRef.current.rot.y + dx * 0.3,
    });
  };
  const onPointerUp = () => {
    if (dragRef.current && !dragRef.current.wasPaused) setPaused(false);
    dragRef.current = null;
  };

  return (
    <div className="relative">
      <div
        className="mx-auto h-[400px] w-full cursor-grab select-none [perspective:800px] active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <div
          className="relative h-full w-full [transform-style:preserve-3d]"
          style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` }}
        >
          {icons.map((icon, i) => {
            const p = points[i];
            return (
              <div
                key={icon.name}
                className="absolute left-1/2 top-1/2 flex h-11 w-11 items-center justify-center rounded-xl border border-forest/10 bg-cream p-2 shadow-sm [transform-style:preserve-3d]"
                style={{
                  transform: `translate3d(${p.x}px, ${p.y}px, ${p.z}px) translate(-50%, -50%)`,
                }}
                title={icon.name}
              >
                <img
                  src={`https://cdn.simpleicons.org/${icon.slug}/1E3A2B`}
                  alt={icon.name}
                  width={22}
                  height={22}
                  loading="lazy"
                  draggable={false}
                />
              </div>
            );
          })}
        </div>
      </div>
      {showControl && (
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? "Play skill cloud rotation" : "Pause skill cloud rotation"}
          className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full border border-forest/15 bg-cream/90 text-forest transition-colors hover:bg-cream"
        >
          {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}
