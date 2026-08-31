import { useRef } from "react";
import { useScroll } from "framer-motion";
import ScrollStroke from "../components/ScrollStroke";
import Highlighter from "../components/Highlighter";
import TypingAnimation from "../components/TypingAnimation";
import DashboardMock from "../components/DashboardMock";

export default function Hero() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });

  return (
    <section
      id="top"
      ref={heroRef}
      className="relative overflow-hidden bg-cream px-6 pb-24 pt-24 md:pb-32 md:pt-40"
    >
      <ScrollStroke
        scrollYProgress={scrollYProgress}
        className="pointer-events-none absolute -right-[20%] top-0 -z-10 h-full w-[140%] opacity-70"
      />

      <div className="relative mx-auto max-w-[900px] text-center">
        <h1 className="font-display text-[clamp(2.5rem,6vw,4rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-forest">
          Stop{" "}
          <span className="relative inline-block">
            <img
              src="/doodles/one.png"
              alt=""
              className="pointer-events-none absolute -inset-4 -z-10 hidden w-[calc(100%+2rem)] md:block"
            />
            <Highlighter action="circle" color="var(--periwinkle)" isView>
              guessing
            </Highlighter>
          </span>{" "}
          what to learn next.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-ink">
          NextSkill turns real job postings into a clear, evidence-backed skill-gap report for{" "}
          <TypingAnimation
            words={["Software Engineers", "Data Scientists", "Data Analysts"]}
            loop
            typeSpeed={60}
            deleteSpeed={30}
            pauseDelay={1400}
            className="font-semibold text-forest"
          />{" "}
          — free, and with the receipts to prove every recommendation.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <a
            href="#pricing"
            className="flex h-12 items-center rounded-full bg-forest px-7 text-sm font-semibold text-cream transition-transform hover:scale-[1.03]"
          >
            Get Your Free Skill Report
          </a>
          <a
            href="#how-it-works"
            className="flex h-12 items-center rounded-full border border-forest px-7 text-sm font-semibold text-forest transition-colors hover:bg-forest/5"
          >
            See How It Works
          </a>
        </div>
      </div>

      <div className="relative mx-auto mt-20 max-w-[900px]">
        <div className="relative overflow-hidden rounded-3xl border border-forest/15 bg-cream shadow-[0_30px_60px_-30px_rgba(20,38,28,0.35)]">
          <DashboardMock variant="skill-gap-report" label="Your skill-gap report" className="h-[420px]" />
        </div>
        <img
          src="/doodles/seven.png"
          alt=""
          className="pointer-events-none absolute -left-6 -top-10 hidden w-16 md:block"
        />
        <span className="pointer-events-none absolute -left-2 -top-14 hidden -rotate-[4deg] font-kicker text-sm text-forest md:block">
          See a real report ↓
        </span>
      </div>
    </section>
  );
}
