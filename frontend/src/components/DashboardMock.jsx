import { cn } from "../lib/cn";

// No real product screenshots exist yet, so these are lightweight CSS/SVG
// mockups standing in for "/screens/*.png" — a labeled browser-chrome frame
// with a layout that reads as the named screen, not a placeholder image tag
// that would 404.
const BARS = {
  "resume-upload": [
    { w: "70%" }, { w: "45%" }, { w: "85%" }, { w: "30%" },
  ],
  "skill-gap-report": [
    { w: "92%", tag: "React", pct: 84 },
    { w: "78%", tag: "TypeScript", pct: 61 },
    { w: "64%", tag: "GraphQL", pct: 47 },
    { w: "50%", tag: "Kubernetes", pct: 33 },
  ],
  "evidence-drilldown": [
    { w: "100%" }, { w: "90%" }, { w: "95%" }, { w: "80%" }, { w: "70%" },
  ],
};

export default function DashboardMock({ variant = "skill-gap-report", label, className }) {
  const rows = BARS[variant] ?? BARS["skill-gap-report"];

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-[inherit] bg-cream",
        className
      )}
    >
      <div className="flex items-center gap-1.5 border-b border-forest/10 bg-cream px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-forest/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-forest/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-forest/20" />
        {label && (
          <span className="ml-3 truncate font-kicker text-[11px] uppercase tracking-widest text-forest/50">
            {label}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-center gap-3 p-6">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-3 flex-1 rounded-full bg-forest/8">
              <div
                className="h-full rounded-full bg-periwinkle"
                style={{ width: row.w, backgroundColor: i % 2 ? "var(--lime)" : "var(--periwinkle)" }}
              />
            </div>
            {row.tag && (
              <span className="w-24 shrink-0 text-xs font-semibold text-forest/70">
                {row.tag} · {row.pct}%
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
