import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Plus, Minus } from "lucide-react";
import { cn } from "../lib/cn";

const WIDTH = 860;
const HEIGHT = 560;
const TICKS = 260;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

// A small from-scratch force-directed layout (repulsion + spring edges +
// centering, classic Fruchterman-Reingold-ish simulation) — no d3 dependency.
// Runs to convergence once on mount/data-change, animated over a couple of
// seconds via requestAnimationFrame, then freezes into a static, still fully
// interactive (hover/click/drag/zoom) SVG layout.
function simulate(nodes, edges) {
  const n = nodes.length;
  if (n === 0) return [];

  const positions = nodes.map((node, i) => {
    const angle = (i / n) * Math.PI * 2;
    const radius = Math.min(WIDTH, HEIGHT) * 0.32;
    return {
      id: node.id,
      x: WIDTH / 2 + Math.cos(angle) * radius + (Math.random() - 0.5) * 20,
      y: HEIGHT / 2 + Math.sin(angle) * radius + (Math.random() - 0.5) * 20,
      vx: 0,
      vy: 0,
    };
  });
  const byId = new Map(positions.map((p) => [p.id, p]));

  const REPEL = 4200;
  const SPRING = 0.02;
  const IDEAL_EDGE_LEN = 140;
  const CENTER_PULL = 0.012;
  const DAMPING = 0.82;

  const frames = [];

  for (let tick = 0; tick < TICKS; tick++) {
    const alpha = 1 - tick / TICKS;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = positions[i];
        const b = positions[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let distSq = dx * dx + dy * dy || 0.01;
        const force = (REPEL / distSq) * alpha;
        const dist = Math.sqrt(distSq);
        dx /= dist;
        dy /= dist;
        a.vx += dx * force;
        a.vy += dy * force;
        b.vx -= dx * force;
        b.vy -= dy * force;
      }
    }

    for (const edge of edges) {
      const a = byId.get(edge.source);
      const b = byId.get(edge.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const targetLen = IDEAL_EDGE_LEN / (0.4 + edge.weight);
      const force = SPRING * (dist - targetLen) * alpha;
      const ux = dx / dist;
      const uy = dy / dist;
      a.vx += ux * force;
      a.vy += uy * force;
      b.vx -= ux * force;
      b.vy -= uy * force;
    }

    for (const p of positions) {
      p.vx += (WIDTH / 2 - p.x) * CENTER_PULL * alpha;
      p.vy += (HEIGHT / 2 - p.y) * CENTER_PULL * alpha;
      p.vx *= DAMPING;
      p.vy *= DAMPING;
      p.x += p.vx;
      p.y += p.vy;
      p.x = Math.max(30, Math.min(WIDTH - 30, p.x));
      p.y = Math.max(30, Math.min(HEIGHT - 30, p.y));
    }

    if (tick % 4 === 0 || tick === TICKS - 1) {
      frames.push(positions.map((p) => ({ id: p.id, x: p.x, y: p.y })));
    }
  }

  return frames;
}

const IDENTITY_TRANSFORM = { x: 0, y: 0, k: 1 };

export default function ForceGraph({
  nodes,
  edges,
  sizeKey = "value",
  color = "var(--periwinkle)",
  onNodeClick,
  selectedId,
  dimmedIds,
  className,
}) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [hoveredId, setHoveredId] = useState(null);
  const [focusedId, setFocusedId] = useState(null);
  // Nodes the user has dragged get a fixed position here, overriding the
  // simulated frame until "Reset view" clears it — the physics never
  // resumes on a pinned node, it just stays where it was dropped.
  const [pinned, setPinned] = useState({});
  const [transform, setTransform] = useState(IDENTITY_TRANSFORM);
  const framesRef = useRef([]);
  const rafRef = useRef(null);
  const svgRef = useRef(null);

  const maxValue = useMemo(
    () => Math.max(1, ...nodes.map((n) => n[sizeKey] || 1)),
    [nodes, sizeKey]
  );

  useEffect(() => {
    framesRef.current = simulate(nodes, edges);
    setFrameIndex(0);
    setPinned({});
    setTransform(IDENTITY_TRANSFORM);
    let i = 0;
    const step = () => {
      i += 1;
      setFrameIndex(Math.min(i, framesRef.current.length - 1));
      if (i < framesRef.current.length - 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  const positions = framesRef.current[frameIndex] || [];
  const posById = new Map(positions.map((p) => [p.id, p]));

  const radiusFor = (node) => 6 + (Math.sqrt((node[sizeKey] || 1) / maxValue) * 20);
  const colorFor = (node) => (typeof color === "function" ? color(node) : color);

  const isViewModified =
    transform.k !== 1 || transform.x !== 0 || transform.y !== 0 || Object.keys(pinned).length > 0;

  const resetView = () => {
    setTransform(IDENTITY_TRANSFORM);
    setPinned({});
  };

  const zoomBy = (factor, anchor) => {
    setTransform((prev) => {
      const nextK = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev.k * factor));
      const k = nextK / prev.k;
      const cx = anchor?.x ?? WIDTH / 2;
      const cy = anchor?.y ?? HEIGHT / 2;
      return { k: nextK, x: cx - (cx - prev.x) * k, y: cy - (cy - prev.y) * k };
    });
  };

  const clientToViewBox = (clientX, clientY) => {
    const rect = svgRef.current.getBoundingClientRect();
    return { x: ((clientX - rect.left) / rect.width) * WIDTH, y: ((clientY - rect.top) / rect.height) * HEIGHT };
  };

  // Wheel-to-zoom, anchored on the cursor position so the point under the
  // mouse stays put — not just a flat scale-up around the center.
  const handleWheel = (e) => {
    e.preventDefault();
    const anchor = clientToViewBox(e.clientX, e.clientY);
    zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1, anchor);
  };

  // Drag on empty canvas pans the view. Dragging a node instead pins that
  // node in place; a plain click (no meaningful movement) still selects it
  // via onNodeClick, fired manually here since the drag logic supersedes
  // the browser's native click event.
  const handleBackgroundPointerDown = (e) => {
    if (e.button !== 0) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = transform.x;
    const origY = transform.y;

    const onMove = (moveEvent) => {
      const rect = svgRef.current.getBoundingClientRect();
      const dx = ((moveEvent.clientX - startX) / rect.width) * WIDTH;
      const dy = ((moveEvent.clientY - startY) / rect.height) * HEIGHT;
      setTransform((prev) => ({ ...prev, x: origX + dx, y: origY + dy }));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const handleNodePointerDown = (e, node) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const current = pinned[node.id] || posById.get(node.id);
    if (!current) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = current.x;
    const origY = current.y;
    let moved = false;

    const onMove = (moveEvent) => {
      const rect = svgRef.current.getBoundingClientRect();
      const dx = ((moveEvent.clientX - startX) / rect.width) * (WIDTH / transform.k);
      const dy = ((moveEvent.clientY - startY) / rect.height) * (HEIGHT / transform.k);
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
      setPinned((prev) => ({
        ...prev,
        [node.id]: {
          x: Math.max(20, Math.min(WIDTH - 20, origX + dx)),
          y: Math.max(20, Math.min(HEIGHT - 20, origY + dy)),
        },
      }));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (!moved) onNodeClick?.(node);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div className="relative h-full w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className={cn("h-full w-full select-none", className)}
        role="img"
        aria-label="Interactive network graph"
        onWheel={handleWheel}
        onPointerDown={handleBackgroundPointerDown}
        style={{ cursor: "grab", touchAction: "none" }}
      >
        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
          <g>
            {edges.map((edge, i) => {
              const a = posById.get(edge.source);
              const b = posById.get(edge.target);
              if (!a || !b) return null;
              const aPos = pinned[edge.source] || a;
              const bPos = pinned[edge.target] || b;
              const dim =
                (hoveredId && edge.source !== hoveredId && edge.target !== hoveredId) ||
                (dimmedIds && (dimmedIds.has(edge.source) || dimmedIds.has(edge.target)));
              return (
                <line
                  key={i}
                  x1={aPos.x}
                  y1={aPos.y}
                  x2={bPos.x}
                  y2={bPos.y}
                  stroke="var(--forest)"
                  strokeOpacity={dim ? 0.04 : 0.14 + edge.weight * 0.25}
                  strokeWidth={0.75 + edge.weight * 2}
                >
                  <title>{`${Math.round(edge.weight * 100)}% connection`}</title>
                </line>
              );
            })}
          </g>
          <g>
            {nodes.map((node) => {
              const framePos = posById.get(node.id);
              const p = pinned[node.id] || framePos;
              if (!p) return null;
              const r = radiusFor(node);
              const isHovered = hoveredId === node.id;
              const isSelected = selectedId === node.id;
              const isFocused = focusedId === node.id;
              const dim = (hoveredId && !isHovered) || (dimmedIds && dimmedIds.has(node.id));
              return (
                <g
                  key={node.id}
                  transform={`translate(${p.x}, ${p.y})`}
                  tabIndex={onNodeClick ? 0 : -1}
                  role={onNodeClick ? "button" : undefined}
                  aria-label={node.label}
                  aria-pressed={isSelected}
                  style={{ cursor: "grab" }}
                  onPointerDown={(e) => handleNodePointerDown(e, node)}
                  onMouseEnter={() => setHoveredId(node.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onFocus={() => setFocusedId(node.id)}
                  onBlur={() => setFocusedId(null)}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && onNodeClick) {
                      e.preventDefault();
                      onNodeClick(node);
                    }
                  }}
                  opacity={dim ? 0.35 : 1}
                >
                  {isFocused && !isSelected && (
                    <circle r={r + 4} fill="none" stroke="var(--forest)" strokeOpacity={0.4} strokeDasharray="3 2" />
                  )}
                  <circle
                    r={r}
                    fill={colorFor(node)}
                    stroke={isSelected ? "var(--forest)" : "white"}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    style={{ transition: "r 0.15s ease" }}
                    transform={isHovered ? "scale(1.15)" : undefined}
                  />
                  <text
                    x={0}
                    y={r + 13}
                    textAnchor="middle"
                    className="pointer-events-none capitalize"
                    fontSize={isHovered || isSelected ? 11.5 : 10}
                    fontWeight={isHovered || isSelected ? 700 : 500}
                    fill="var(--forest)"
                    fillOpacity={0.85}
                    stroke="var(--cream)"
                    strokeWidth={3}
                    strokeLinejoin="round"
                    paintOrder="stroke"
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
        {isViewModified && (
          <button
            type="button"
            onClick={resetView}
            title="Reset view"
            aria-label="Reset view"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-forest/15 bg-white/90 text-forest/60 shadow-sm transition-colors hover:bg-white hover:text-forest"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => zoomBy(1.2)}
          title="Zoom in"
          aria-label="Zoom in"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-forest/15 bg-white/90 text-forest/60 shadow-sm transition-colors hover:bg-white hover:text-forest"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.2)}
          title="Zoom out"
          aria-label="Zoom out"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-forest/15 bg-white/90 text-forest/60 shadow-sm transition-colors hover:bg-white hover:text-forest"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
