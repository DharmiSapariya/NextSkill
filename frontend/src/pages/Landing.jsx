import Hero from "../intro/Hero";

// Landing page — Hero plays the NEXTSKILL entrance once on mount, then
// stays as the page's own top section; scrolling past it reveals the rest
// of the page below (still a placeholder — first up for a real design
// pass beyond the hero).
export default function Landing() {
  return (
    <>
      <Hero />
      <section className="mx-auto max-w-7xl px-6 py-24">
        <h1 className="text-4xl font-bold text-charcoal">NextSkill</h1>
        <p className="mt-4 max-w-xl text-charcoal/70">
          Market-aware skill-gap recommendations, built from real job posting data.
        </p>
      </section>
    </>
  );
}
