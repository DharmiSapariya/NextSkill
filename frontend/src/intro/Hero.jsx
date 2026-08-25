// The landing page's first in-flow section — plain forest backdrop that
// picks up right where the intro overlay's morph left off (its logo has
// already traveled to the nav corner by the time this is visible), so
// scrolling past this into the rest of the page feels continuous rather
// than like the "real" hero never happened.
export default function Hero() {
  return (
    <section className="flex h-screen w-full flex-col justify-end bg-forest pb-6 sm:pb-8">
      <div className="flex items-end justify-between px-6 sm:px-10 font-sans text-[10px] uppercase tracking-[0.25em] text-cream/60">
        <span>Career intelligence OS</span>
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-lime" />
          Scroll to explore
        </span>
      </div>
    </section>
  );
}
