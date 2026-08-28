import SectionHeading from "../../landing/SectionHeading";
import IllustrationCard from "../../landing/IllustrationCard";

// The landing page's own hero language, reused for every feature page
// instead of a plain white title bar: a periwinkle band, the fold-in
// SectionHeading (same component the marketing page uses), and the same
// recolored illustration this feature already has on the landing page's
// FeatureGrid card — so a visitor recognizes "Recommend" here as the same
// thing they saw promised on the homepage, not a differently-designed app
// bolted on afterward. Periwinkle rather than forest as the dominant band
// color — forest stays the accent (eyebrow, decorative blob), not the
// canvas, per feedback that these pages were leaning too dark-green-heavy.
export default function FeatureHeader({ eyebrow, title, subtitle, illustration }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-periwinkle/35 px-6 py-10 sm:px-10 sm:py-14">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-lime/25" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-forest/8" />
      <div className="relative grid grid-cols-1 items-center gap-8 sm:grid-cols-[1.3fr_1fr]">
        <SectionHeading eyebrow={eyebrow} heading={title} body={subtitle} tone="dark" headingSize="clamp(1.9rem, 4vw, 2.75rem)" />
        {illustration && (
          <IllustrationCard src={illustration} alt="" className="mx-auto hidden w-full max-w-[220px] sm:block" float />
        )}
      </div>
    </div>
  );
}
