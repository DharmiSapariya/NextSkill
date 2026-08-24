import { ArrowUpRight } from "lucide-react";

// A slowly-spinning circular text stamp — the "circle words" typographic
// treatment, built from a plain SVG textPath around a circle rather than
// any third-party circular-text library. The center glyph stays still
// while the ring of text rotates continuously around it.
export default function CircularBadge({
  text = "SKILL GAPS • CAREER PATHS • REAL DATA • ",
  size = 176,
  className = "",
}) {
  const radius = size / 2 - 14;
  const pathId = "circular-badge-path";

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="badge-spin h-full w-full">
        <defs>
          <path id={pathId} d={`M ${size / 2},${size / 2} m -${radius},0 a ${radius},${radius} 0 1,1 ${radius * 2},0 a ${radius},${radius} 0 1,1 -${radius * 2},0`} />
        </defs>
        <text className="fill-forest font-sans text-[11px] font-semibold uppercase tracking-[0.2em]">
          <textPath href={`#${pathId}`}>{text.repeat(2)}</textPath>
        </text>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-lime text-forest">
          <ArrowUpRight className="h-5 w-5" strokeWidth={2.5} />
        </span>
      </div>
    </div>
  );
}
