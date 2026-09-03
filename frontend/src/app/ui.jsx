import { useEffect, useRef, useState } from "react";
import { cn } from "../lib/cn";
import Loader from "../components/Loader";

// Animates from its previous rendered value to `value` whenever it changes —
// used by StatTile so numbers feel alive instead of just appearing.
export function CountUp({ value, duration = 800 }) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return undefined;
    const start = performance.now();

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (to - from) * eased;
      setDisplay(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
        setDisplay(to);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return <>{Math.round(display).toLocaleString()}</>;
}

export function PageHeader({ kicker, title, description, actions }) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        {kicker && (
          <span className="font-kicker text-xs uppercase tracking-widest text-forest/50">{kicker}</span>
        )}
        <h1 className="mt-1 font-display text-[clamp(1.5rem,3vw,2.25rem)] font-bold text-forest">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-forest/65">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </div>
  );
}

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn("rounded-2xl border border-forest/10 bg-white/60 p-6", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function Button({ className, variant = "primary", size = "md", as: As = "button", ...props }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50";
  const sizes = { sm: "h-9 px-4 text-xs", md: "h-11 px-6 text-sm", lg: "h-12 px-7 text-sm" };
  const variants = {
    primary: "bg-forest text-cream hover:scale-[1.02]",
    secondary: "border border-forest/20 text-forest hover:bg-forest/5",
    ghost: "text-forest hover:bg-forest/5",
    danger: "bg-red-600/90 text-white hover:bg-red-600",
  };
  return <As className={cn(base, sizes[size], variants[variant], className)} {...props} />;
}

export function Input({ className, label, error, ...props }) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-xs font-semibold text-forest/70">{label}</span>}
      <input
        className={cn(
          "h-11 rounded-xl border border-forest/15 bg-white px-4 text-sm text-forest outline-none transition-colors placeholder:text-forest/35 focus:border-forest/40",
          error && "border-red-400",
          className
        )}
        {...props}
      />
      {error && <span className="text-xs font-medium text-red-600">{error}</span>}
    </label>
  );
}

export function Badge({ className, children, tone = "forest", style, ...props }) {
  const tones = {
    forest: "bg-forest/8 text-forest",
    lime: "bg-lime/40 text-forest",
    periwinkle: "bg-periwinkle/60 text-forest",
    coral: "bg-coral/40 text-forest",
    sky: "bg-sky/40 text-forest",
    amber: "bg-amber/40 text-forest",
    violet: "bg-violet/40 text-forest",
    red: "bg-red-100 text-red-700",
    green: "bg-emerald-100 text-emerald-700",
  };
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", !style && tones[tone], className)}
      style={style}
      {...props}
    >
      {children}
    </span>
  );
}

export function LoadingState({ label = "Loading…" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <Loader />
      <span className="text-sm text-forest/50">{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-200 bg-red-50 py-16 text-center">
      <span className="text-sm font-semibold text-red-700">{message || "Something went wrong."}</span>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title, description, action, illustration = "/illustrations/5n.png" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-forest/15 py-14 text-center">
      {illustration && <img src={illustration} alt="" className="mb-2 h-28 w-28 object-contain" />}
      <span className="font-display text-base font-bold text-forest">{title}</span>
      {description && <p className="max-w-sm text-sm text-forest/55">{description}</p>}
      {action}
    </div>
  );
}

// A small "i" glyph that shows a plain-language explanation of a metric or
// term on hover/focus via the native title tooltip — no extra JS needed.
export function InfoHint({ text, className }) {
  return (
    <span
      tabIndex={0}
      title={text}
      className={cn(
        "inline-flex h-3.5 w-3.5 shrink-0 cursor-help items-center justify-center rounded-full bg-forest/12 text-[9px] font-bold leading-none text-forest/60 outline-none focus-visible:ring-2 focus-visible:ring-forest/30",
        className
      )}
      aria-label={text}
    >
      i
    </span>
  );
}

export function Skeleton({ className }) {
  return <div className={cn("animate-pulse rounded-lg bg-forest/8", className)} />;
}

export function StatTile({ label, value, sub, icon: Icon, accent }) {
  const isNumeric = typeof value === "number" && Number.isFinite(value);
  return (
    <Card className={cn("flex flex-col gap-1", accent && "border-forest/15")}>
      <div className="flex items-center justify-between">
        <span className="font-kicker text-[11px] uppercase tracking-widest text-forest/45">{label}</span>
        {Icon && (
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: accent || "var(--forest)", opacity: 0.85 }}
          >
            <Icon className="h-3.5 w-3.5 text-forest" />
          </span>
        )}
      </div>
      <span className="font-display text-2xl font-bold text-forest">
        {isNumeric ? <CountUp value={value} /> : value}
      </span>
      {sub && <span className="text-xs text-forest/50">{sub}</span>}
    </Card>
  );
}
