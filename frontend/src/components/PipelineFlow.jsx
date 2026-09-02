import { cn } from "../lib/cn";

function NodeCard({ item }) {
  const Icon = item.icon;
  return (
    <div className="flex items-center gap-2.5 rounded-full border border-forest/10 bg-cream px-4 py-2.5 shadow-[0_2px_10px_-4px_rgba(20,38,28,0.25)]">
      <Icon className="h-4 w-4 shrink-0" style={{ color: item.color }} />
      <span className="whitespace-nowrap text-sm font-semibold text-forest">{item.label}</span>
    </div>
  );
}

const connector =
  "h-10 w-px shrink-0 bg-gradient-to-b from-transparent via-forest/20 to-transparent md:h-px md:w-12 md:bg-gradient-to-r";

// Replaces the earlier 3D-orbit SolarSystem visual, which rendered as an
// unreadable jumble of floating pills — a plain sources -> engine -> output
// flow says the same thing ("one engine reads many sources, you get one
// report") far more clearly.
export default function PipelineFlow({ sources, outputs, className }) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-3xl flex-col items-center gap-6 md:flex-row md:justify-center",
        className
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <span className="font-kicker text-xs uppercase tracking-widest text-forest/45">Sources</span>
        <div className="flex flex-col gap-3">
          {sources.map((item) => (
            <NodeCard key={item.id} item={item} />
          ))}
        </div>
      </div>

      <div className={connector} />

      <div className="flex flex-col items-center gap-3">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-lime/60 bg-forest shadow-[0_0_30px_rgba(239,248,122,0.35)]">
          <span className="absolute inset-0 animate-ping rounded-full bg-lime/20" />
          <span className="relative font-display text-base font-bold text-cream">NS</span>
        </div>
        <span className="font-kicker text-xs uppercase tracking-widest text-forest/45">Engine</span>
      </div>

      <div className={connector} />

      <div className="flex flex-col items-center gap-3">
        <span className="font-kicker text-xs uppercase tracking-widest text-forest/45">Output</span>
        <div className="flex flex-col gap-3">
          {outputs.map((item) => (
            <NodeCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
