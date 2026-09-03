import { CheckCircle, Sparkles } from "lucide-react";
import Highlighter from "../components/Highlighter";
import ServiceCard from "../components/ServiceCard";

const freeTier = {
  title: "Free",
  price: "$0/mo",
  icon: CheckCircle,
  gradient: "from-periwinkle to-periwinkle/70",
  description: "Every core feature, forever — no trial, no credit card.",
  features: [
    "Evidence-backed skill-gap recommendations",
    "Match score & salary prediction",
    "Resume auto-parsing",
    "Shareable public report links",
    "20 report runs kept in your history",
    "3 evidence postings shown per gap skill",
  ],
  cta: "Get Started Free",
  href: "/signup",
};

const proTier = {
  title: "Pro",
  price: "Contact for pricing",
  icon: Sparkles,
  gradient: "from-lime to-lime/70",
  description: "Same features as Free — Pro just goes deeper on the same data.",
  features: [
    "Everything in Free",
    "100 report runs kept in your history",
    "10 evidence postings shown per gap skill",
  ],
  cta: "Join the Waitlist",
  href: "#top",
};

export default function Pricing() {
  return (
    <section id="pricing" className="bg-forest px-6 py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-display text-[clamp(1.75rem,4vw,2.5rem)] font-bold leading-tight text-cream-on-dark">
          Career intelligence that&apos;s actually{" "}
          <Highlighter action="highlight" color="var(--lime)" isView>
            free
          </Highlighter>
          .
        </h2>
      </div>

      <div className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
        <ServiceCard service={freeTier} />
        <ServiceCard service={proTier} />
      </div>
    </section>
  );
}
