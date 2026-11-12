import { cn } from "../lib/cn";

// Fixed values used only in public landing-page examples.
const BARS = {
  "resume-upload": [
    { w: "70%" }, { w: "45%" }, { w: "85%" }, { w: "30%" },
  ],
  "skill-gap-report": [
    { tag: "React", pct: 84 },
    { tag: "TypeScript", pct: 61 },
    { tag: "GraphQL", pct: 47 },
    { tag: "Kubernetes", pct: 33 },
  ],
  "evidence-drilldown": [
    { w: "100%" }, { w: "90%" }, { w: "95%" }, { w: "80%" }, { w: "70%" },
  ],
};

export default function DashboardMock({ variant = "skill-gap-report", label, className }) {
  const rows = BARS[variant] ?? BARS["skill-gap-report"];
  const hasPercentages = rows[0].pct !== undefined;

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-[inherit] bg-cream",
        className
      )}
    >
      <div className="flex items-center gap-1.5 border-b border-forest/10 bg-cream px-4 py-3">
        <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-forest/20" />
        <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-forest/20" />
        <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-forest/20" />
        {label && (
          <span className="ml-3 truncate font-kicker text-[11px] uppercase tracking-widest text-ink/70">
            {label}
          </span>
        )}
      </div>
      <p className="px-4 pt-3 text-xs leading-relaxed text-ink/80">
        <strong className="font-semibold">Illustrative example.</strong>
        {hasPercentages && " Percentages are demonstration values only."}
      </p>
      <div className="flex flex-1 flex-col justify-center gap-3 p-4 sm:p-6">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-3">
            <div aria-hidden="true" className="h-3 min-w-0 flex-1 rounded-full bg-forest/8">
              <div
                className="h-full rounded-full bg-periwinkle"
                style={{ width: row.pct === undefined ? row.w : `${row.pct}%`, backgroundColor: i % 2 ? "var(--lime)" : "var(--periwinkle)" }}
              />
            </div>
            {row.tag && (
              <span className="w-24 shrink-0 text-xs font-semibold text-ink/80">
                {row.tag} · {row.pct}%
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
