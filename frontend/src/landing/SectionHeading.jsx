import FoldText from "../components/FoldText";

// Shared eyebrow + fold-in heading pattern used across every landing
// section below the hero, so each section only has to describe its own
// copy rather than re-implement the reveal.
export default function SectionHeading({
  eyebrow,
  heading,
  body,
  align = "left",
  tone = "dark",
  headingSize = "clamp(2.25rem, 5.5vw, 4.25rem)",
}) {
  const alignClass = align === "center" ? "items-center text-center" : "items-start text-left";
  const textTone = tone === "light" ? "text-cream" : "text-charcoal";
  const eyebrowTone = tone === "light" ? "text-periwinkle" : "text-forest/70";
  const bodyTone = tone === "light" ? "text-cream/75" : "text-charcoal/65";

  return (
    <div className={`flex flex-col gap-4 ${alignClass}`}>
      {eyebrow && (
        <span className={`font-sans text-xs font-semibold uppercase tracking-[0.3em] ${eyebrowTone}`}>
          {eyebrow}
        </span>
      )}
      <FoldText
        text={heading}
        splitBy="word"
        hinge="bottom"
        trigger="scroll"
        duration={0.7}
        stagger={0.06}
        perspective={600}
        creaseShading={0.4}
        fontSize={headingSize}
        fontWeight={600}
        color={tone === "light" ? "var(--color-background)" : "var(--color-ink)"}
        className={`font-display ${textTone}`}
        style={{ lineHeight: 1.05 }}
      />
      {body && <p className={`max-w-xl font-sans text-base leading-relaxed sm:text-lg ${bodyTone}`}>{body}</p>}
    </div>
  );
}
