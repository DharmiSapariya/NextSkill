export default function Card({ title, eyebrow, children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-forest/10 bg-white p-6 ${className}`}>
      {eyebrow && (
        <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-forest/50">{eyebrow}</span>
      )}
      {title && <h2 className="mt-1 font-display text-xl font-semibold text-charcoal">{title}</h2>}
      <div className={title || eyebrow ? "mt-4" : ""}>{children}</div>
    </div>
  );
}
