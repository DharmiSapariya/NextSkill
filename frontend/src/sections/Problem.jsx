import Highlighter from "../components/Highlighter";

export default function Problem() {
  return (
    <section className="relative overflow-hidden bg-cream px-6 py-24 md:py-[120px]">
      <img
        src="/doodles/four.png"
        alt=""
        className="pointer-events-none absolute right-[8%] top-4 hidden w-40 opacity-30 md:block"
      />
      <div className="relative mx-auto max-w-[720px] text-center">
        <h2 className="font-display text-[clamp(1.75rem,4vw,2.5rem)] font-bold leading-tight text-forest">
          Every job posting says something different.{" "}
          <Highlighter action="underline" color="var(--lime)" isView>
            Reading them all one at a time
          </Highlighter>{" "}
          isn&apos;t a strategy.
        </h2>

        <img
          src="/illustrations/12n.png"
          alt="Figure searching through listings with binoculars"
          className="mx-auto mt-10 w-[280px] md:w-[360px]"
        />

        <p className="mx-auto mt-8 max-w-xl text-[17px] text-ink/75">
          Postings are scattered across job boards, phrased inconsistently, and change week to
          week. There&apos;s no simple way to see which skills are actually rising in demand for a
          specific role — until you&apos;ve read hundreds of listings yourself.
        </p>
      </div>
    </section>
  );
}
