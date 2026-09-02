import Highlighter from "../components/Highlighter";
import EvidenceTabs from "../components/EvidenceTabs";

const evidenceItems = [
  { label: "Software Engineer", variant: "evidence-drilldown" },
  { label: "Data Scientist", variant: "skill-gap-report" },
  { label: "Data Analyst", variant: "resume-upload" },
];

export default function Evidence() {
  return (
    <section className="bg-cream px-6 py-24 text-forest">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 max-w-2xl">
          <h2 className="font-display text-[clamp(1.5rem,3.5vw,2.25rem)] font-bold leading-tight">
            <Highlighter action="underline" color="var(--periwinkle)" isView>
              Market-aware matching
            </Highlighter>
            , not single-JD matching.
          </h2>
          <p className="mt-4 text-[16px] text-forest/75">
            Most resume tools compare you to one job description. NextSkill compares your skills
            against the aggregate demand curve for a role — built from thousands of postings — so
            a recommendation reflects the market, not one recruiter&apos;s wording.
          </p>
        </div>

        <EvidenceTabs items={evidenceItems} />
      </div>
    </section>
  );
}
