import Highlighter from "../components/Highlighter";

export default function Reassurance() {
  return (
    <section className="bg-cream px-6 py-24">
      <div className="mx-auto max-w-[760px] text-center">
        <h2 className="font-display text-[clamp(1.75rem,4vw,2.5rem)] font-bold leading-tight text-forest">
          It doesn&apos;t matter if you&apos;re{" "}
          <Highlighter action="circle" color="var(--lime)" isView>
            just starting out
          </Highlighter>{" "}
          or ten years into your career.
        </h2>

        <img
          src="/illustrations/21n.png"
          alt="Figure leaping forward across stepping stones"
          className="mx-auto mt-10 w-[260px] md:w-[320px]"
        />

        <p className="mx-auto mt-8 max-w-xl text-[17px] text-ink/75">
          NextSkill shows the shortest evidence-backed path from where you are to where you want
          to be — whether that&apos;s your first Data Analyst role or a senior Software Engineer
          transition.
        </p>
      </div>
    </section>
  );
}
