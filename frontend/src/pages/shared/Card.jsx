// tone picks which of the locked six colors this card sits on — used to
// spread the palette across a page instead of every card defaulting to
// plain white, while keeping each individual card readable (dark text on
// the light tones, cream text on forest).
const TONE_STYLES = {
  white: { bg: "bg-white", border: "border-forest/10", eyebrow: "text-forest/50", body: "text-charcoal" },
  periwinkle: { bg: "bg-periwinkle/25", border: "border-forest/10", eyebrow: "text-forest/60", body: "text-charcoal" },
  lime: { bg: "bg-lime/20", border: "border-forest/15", eyebrow: "text-forest/60", body: "text-charcoal" },
  forest: { bg: "bg-forest", border: "border-cream/10", eyebrow: "text-periwinkle", body: "text-cream" },
  cream: { bg: "bg-cream", border: "border-forest/10", eyebrow: "text-forest/50", body: "text-charcoal" },
};

export default function Card({ title, eyebrow, children, className = "", tone = "white" }) {
  const t = TONE_STYLES[tone] || TONE_STYLES.white;
  return (
    <div className={`rounded-2xl border ${t.border} ${t.bg} p-6 ${className}`}>
      {eyebrow && <span className={`font-sans text-[11px] font-semibold uppercase tracking-[0.2em] ${t.eyebrow}`}>{eyebrow}</span>}
      {title && <h2 className={`mt-1 font-display text-xl font-semibold ${t.body}`}>{title}</h2>}
      <div className={title || eyebrow ? "mt-4" : ""}>{children}</div>
    </div>
  );
}
