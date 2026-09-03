import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../lib/cn";

const WIDTH = 860;
const HEIGHT = 560;
const TICKS = 260;

// A small from-scratch force-directed layout (repulsion + spring edges +
// centering, classic Fruchterman-Reingold-ish simulation) — no d3 dependency.
// Runs to convergence once on mount/data-change, animated over a couple of
// seconds via requestAnimationFrame, then freezes into a static, still fully
// interactive (hover/click) SVG layout.
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

export default function ForceGraph({
  nodes,
  edges,
  sizeKey = "value",
  color = "var(--periwinkle)",
  onNodeClick,
  selectedId,
  className,
}) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [hoveredId, setHoveredId] = useState(null);
  const framesRef = useRef([]);
  const rafRef = useRef(null);

  const maxValue = useMemo(
    () => Math.max(1, ...nodes.map((n) => n[sizeKey] || 1)),
    [nodes, sizeKey]
  );

  useEffect(() => {
    framesRef.current = simulate(nodes, edges);
    setFrameIndex(0);
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

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={cn("h-full w-full select-none", className)}
      role="img"
      aria-label="Interactive network graph"
    >
      <g>
        {edges.map((edge, i) => {
          const a = posById.get(edge.source);
          const b = posById.get(edge.target);
          if (!a || !b) return null;
          const dim =
            hoveredId && edge.source !== hoveredId && edge.target !== hoveredId;
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="var(--forest)"
              strokeOpacity={dim ? 0.04 : 0.14 + edge.weight * 0.25}
              strokeWidth={0.75 + edge.weight * 2}
            />
          );
        })}
      </g>
      <g>
        {nodes.map((node) => {
          const p = posById.get(node.id);
          if (!p) return null;
          const r = radiusFor(node);
          const isHovered = hoveredId === node.id;
          const isSelected = selectedId === node.id;
          const dim = hoveredId && !isHovered;
          return (
            <g
              key={node.id}
              transform={`translate(${p.x}, ${p.y})`}
              className={onNodeClick ? "cursor-pointer" : undefined}
              onMouseEnter={() => setHoveredId(node.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onNodeClick?.(node)}
              opacity={dim ? 0.35 : 1}
            >
              <circle
                r={r}
                fill={color}
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
    </svg>
  );
}
