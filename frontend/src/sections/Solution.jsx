import { Target, FileSearch, TrendingUp, BarChart3, DollarSign, GitBranch, ShieldCheck } from "lucide-react";
import Highlighter from "../components/Highlighter";
import { OrbitingCircles } from "../components/OrbitingCircles";

function Chip({ children }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-periwinkle text-forest">
      {children}
    </div>
  );
}

export default function Solution() {
  return (
    <section className="relative bg-cream px-6 py-24">
      <div className="mx-auto max-w-[720px] text-center">
        <h2 className="font-display text-[clamp(1.75rem,4vw,2.5rem)] font-bold leading-tight text-forest">
          <Highlighter action="circle" color="var(--periwinkle)" isView>
            One engine
          </Highlighter>{" "}
          reads the postings. You get the answer.
        </h2>
      </div>

      <div className="relative mx-auto mt-4 h-[420px] w-full max-w-2xl overflow-hidden">
        <div className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-forest font-display text-lg font-bold text-cream">
          NS
        </div>
        <OrbitingCircles radius={90} duration={22} pathColor="var(--lime)">
          <Chip><Target className="h-4 w-4" /></Chip>
          <Chip><FileSearch className="h-4 w-4" /></Chip>
          <Chip><TrendingUp className="h-4 w-4" /></Chip>
        </OrbitingCircles>
        <OrbitingCircles radius={160} reverse duration={28} pathColor="var(--periwinkle)">
          <Chip><BarChart3 className="h-4 w-4" /></Chip>
          <Chip><DollarSign className="h-4 w-4" /></Chip>
          <Chip><GitBranch className="h-4 w-4" /></Chip>
          <Chip><ShieldCheck className="h-4 w-4" /></Chip>
        </OrbitingCircles>
      </div>

      <p className="mx-auto mt-4 max-w-xl text-center font-kicker text-sm uppercase tracking-widest text-forest/60">
        Adzuna + RemoteOK → Skill Taxonomy → Trend Model → Your Report
      </p>
    </section>
  );
}
