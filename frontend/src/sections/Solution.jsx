import { Database, Tags, TrendingUp, FileText } from "lucide-react";
import DoodleCircle from "../components/DoodleCircle";
import { SolarSystem } from "../components/SolarSystem";

const pipelineOrbits = [
  {
    id: "sources",
    radiusClass: "var(--radius-inner)",
    speed: 22,
    items: [
      { id: "adzuna", label: "Adzuna", color: "var(--lime)", icon: Database },
      { id: "remoteok", label: "RemoteOK", color: "var(--lime)", icon: Database },
    ],
  },
  {
    id: "pipeline",
    radiusClass: "var(--radius-outer)",
    speed: 34,
    items: [
      { id: "taxonomy", label: "Skill Taxonomy", color: "var(--periwinkle)", icon: Tags },
      { id: "trend", label: "Trend Model", color: "var(--periwinkle)", icon: TrendingUp },
      { id: "report", label: "Your Report", color: "var(--periwinkle)", icon: FileText },
    ],
  },
];

export default function Solution() {
  return (
    <section className="relative bg-cream px-6 py-24">
      <div className="mx-auto max-w-[720px] text-center">
        <h2 className="font-display text-[clamp(1.75rem,4vw,2.5rem)] font-bold leading-tight text-forest">
          <DoodleCircle color="periwinkle">One engine</DoodleCircle>{" "}
          reads the postings. You get the answer.
        </h2>
      </div>

      <SolarSystem className="mx-auto mt-6" orbits={pipelineOrbits} />
    </section>
  );
}
