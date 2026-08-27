// Shared page-title block for every feature page — consistent eyebrow +
// heading + subtitle pattern so each page only has to supply its own copy.
export default function PageHeader({ eyebrow, title, subtitle }) {
  return (
    <div className="mb-10 flex flex-col gap-2">
      {eyebrow && (
        <span className="font-sans text-xs font-semibold uppercase tracking-[0.25em] text-forest/60">{eyebrow}</span>
      )}
      <h1 className="font-display text-3xl font-bold text-charcoal sm:text-4xl">{title}</h1>
      {subtitle && <p className="max-w-2xl font-sans text-charcoal/60">{subtitle}</p>}
    </div>
  );
}
