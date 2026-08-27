import { useMemo, useState } from "react";

const SIZE = 560;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 70;

// A deterministic circular layout instead of a real physics-based
// force-directed graph — no charting/graph library in the stack, and this
// reads just as clearly for ~20-node data: nodes placed evenly around a
// circle (sized by `sizeField`), edges drawn between connected pairs
// (weighted by opacity/thickness), with hover isolating one node's
// connections. Shared between the skill co-occurrence graph and the
// role-transition graph — same shape of data (nodes + weighted edges),
// just different field names for the node's size metric.
export default function CircularGraph({ nodes, edges, sizeField = "mention_count", onSelect, selected }) {
  const [hovered, setHovered] = useState(null);
  const active = selected ?? hovered;

  const positioned = useMemo(() => {
    const maxSize = Math.max(...nodes.map((n) => n[sizeField] ?? 1), 1);
    return nodes.map((node, index) => {
      const angle = (index / nodes.length) * Math.PI * 2 - Math.PI / 2;
      return {
        ...node,
        x: CENTER + RADIUS * Math.cos(angle),
        y: CENTER + RADIUS * Math.sin(angle),
        r: 6 + ((node[sizeField] ?? 1) / maxSize) * 16,
      };
    });
  }, [nodes, sizeField]);

  const byId = useMemo(() => Object.fromEntries(positioned.map((n) => [n.id, n])), [positioned]);
  const connectedIds = useMemo(() => {
    if (!active) return null;
    const set = new Set([active]);
    edges.forEach((e) => {
      if (e.source === active) set.add(e.target);
      if (e.target === active) set.add(e.source);
    });
    return set;
  }, [active, edges]);

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto w-full max-w-xl">
      {edges.map((edge) => {
        const a = byId[edge.source];
        const b = byId[edge.target];
        if (!a || !b) return null;
        const dimmed = connectedIds && !(connectedIds.has(edge.source) && connectedIds.has(edge.target));
        return (
          <line
            key={`${edge.source}-${edge.target}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="var(--color-brand)"
            strokeWidth={1 + edge.weight * 4}
            opacity={dimmed ? 0.04 : 0.15 + edge.weight * 0.5}
          />
        );
      })}
      {positioned.map((node) => {
        const dimmed = connectedIds && !connectedIds.has(node.id);
        return (
          <g
            key={node.id}
            onMouseEnter={() => setHovered(node.id)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onSelect?.(node.id)}
            className={onSelect ? "cursor-pointer" : ""}
            opacity={dimmed ? 0.25 : 1}
          >
            <circle
              cx={node.x}
              cy={node.y}
              r={node.r}
              fill={active === node.id ? "#EFF87A" : "var(--color-secondary)"}
              stroke="var(--color-brand)"
              strokeWidth={selected === node.id ? 2.5 : 1}
            />
            <text x={node.x} y={node.y - node.r - 6} textAnchor="middle" className="fill-charcoal font-sans text-[10px] font-medium">
              {node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
