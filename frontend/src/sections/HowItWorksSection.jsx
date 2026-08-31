import Highlighter from "../components/Highlighter";
import HowItWorks from "../components/HowItWorks";
import ImageRevealSection from "../components/ImageRevealSection";
import DashboardMock from "../components/DashboardMock";

const steps = [
  {
    title: "Tell us your target role.",
    description:
      "Paste your current skills or upload a resume — we auto-parse it into a structured skill profile.",
  },
  {
    title: "We match you against real postings.",
    description:
      "Your profile is compared against thousands of live listings for that role, not a single job description.",
  },
  {
    title: "See your ranked skill gaps, with evidence.",
    description:
      'Every recommendation shows the posting count and time window behind it — for example, "appeared in 340 of 1,200 postings this quarter, up from 210 last quarter."',
  },
  {
    title: "Track your progress over time.",
    description:
      "Come back after you've learned something — see your match score move and what's newly worth learning next.",
  },
];

const revealItems = [
  {
    title: "Upload once",
    subtitle: "01 / Resume Parsing",
    node: <DashboardMock variant="resume-upload" label="Resume parser" />,
  },
  {
    title: "See the gap",
    subtitle: "02 / Ranked Recommendations",
    node: <DashboardMock variant="skill-gap-report" label="Skill-gap report" />,
  },
  {
    title: "Check the evidence",
    subtitle: "03 / Posting-Level Proof",
    node: <DashboardMock variant="evidence-drilldown" label="Evidence drilldown" />,
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative overflow-hidden bg-forest px-6 py-24">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(var(--cream) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="relative mx-auto max-w-3xl text-center">
        <h2 className="font-display text-[clamp(1.75rem,4vw,2.5rem)] font-bold leading-tight text-cream-on-dark">
          How it{" "}
          <Highlighter action="underline" color="var(--lime)" isView>
            works
          </Highlighter>
          .
        </h2>
      </div>

      <div className="relative mx-auto mt-16 max-w-5xl">
        <HowItWorks steps={steps} />
      </div>

      <div className="relative mt-24 bg-forest-2 py-4">
        <ImageRevealSection items={revealItems} />
      </div>
    </section>
  );
}
