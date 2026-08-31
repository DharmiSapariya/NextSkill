import Highlighter from "../components/Highlighter";
import TextRotateScroll from "../components/TextRotateScroll";
import DashboardMock from "../components/DashboardMock";

const evidenceItems = [
  { label: "Software Engineer", link: "#", node: <DashboardMock variant="evidence-drilldown" label="SDE evidence" /> },
  { label: "Data Scientist", link: "#", node: <DashboardMock variant="skill-gap-report" label="DS evidence" /> },
  { label: "Data Analyst", link: "#", node: <DashboardMock variant="resume-upload" label="DA evidence" /> },
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

        <TextRotateScroll items={evidenceItems} />
      </div>
    </section>
  );
}
