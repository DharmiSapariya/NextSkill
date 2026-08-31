import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import FoldText from "../components/FoldText";
import IllustrationCard from "./IllustrationCard";
import CircularBadge from "./CircularBadge";

export default function CTASection() {
  return (
    <section className="relative overflow-hidden bg-cream px-6 py-28 sm:py-36">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 lg:grid-cols-2">
        <div className="flex flex-col items-start gap-8">
          <CircularBadge size={132} />
          <FoldText
            text="Stop guessing what to learn next."
            splitBy="word"
            hinge="left"
            trigger="scroll"
            duration={0.6}
            stagger={0.05}
            perspective={550}
            creaseShading={0.4}
            fontSize="clamp(2rem, 4.6vw, 3.5rem)"
            fontWeight={600}
            color="var(--color-ink)"
            className="font-display"
            style={{ lineHeight: 1.08 }}
          />
          <p className="max-w-md font-sans text-base text-charcoal/65 sm:text-lg">
            Create a free account and get your first skill-gap map in under two minutes — no credit card, no fifty-question
            onboarding quiz.
          </p>
          <Link
            to="/login"
            data-cursor="view"
            className="group inline-flex items-center gap-2 rounded-full bg-forest px-7 py-4 font-sans text-sm font-semibold uppercase tracking-[0.15em] text-cream transition-transform duration-300 hover:-translate-y-0.5"
          >
            Get your skill map
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>

        <IllustrationCard src="/illustrations/cta.png" alt="" className="mx-auto w-full max-w-md" />
      </div>
    </section>
  );
}
