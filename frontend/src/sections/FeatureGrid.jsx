import Highlighter from "../components/Highlighter";
import Carousel006 from "../components/Carousel006";

const items = [
  {
    title: "Skill-Gap Recommendations",
    description: "Ranked by real market demand across thousands of postings — not a generic top-10 list.",
    illustration: "/illustrations/19n.png",
  },
  {
    title: "Evidence, Not a Black Box",
    description: "Click into any recommendation and see the postings behind it.",
    illustration: "/illustrations/7n.png",
  },
  {
    title: "Resume → Match Score",
    description: "Upload your resume for an auto-parsed skill profile and a statistical match score.",
    illustration: "/illustrations/13.n.png",
  },
  {
    title: "Salary Prediction & Role Graph",
    description: "See predicted salary ranges and explore role-transition paths built from skill co-occurrence.",
    illustration: "/illustrations/3n.png",
  },
];

export default function FeatureGrid() {
  return (
    <section id="features" className="bg-lime px-6 py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-display text-[clamp(1.75rem,4vw,2.5rem)] font-bold leading-tight text-forest">
          Everything you need to plan your{" "}
          <Highlighter action="underline" color="var(--forest)" isView>
            next move
          </Highlighter>
          .
        </h2>
        <a
          href="#pricing"
          className="mt-6 inline-flex h-12 items-center rounded-full bg-forest px-7 text-sm font-semibold text-lime transition-transform hover:scale-[1.03]"
        >
          Get Started Free
        </a>
      </div>

      <div className="mx-auto mt-10 max-w-5xl">
        <Carousel006 items={items} />
      </div>
    </section>
  );
}
