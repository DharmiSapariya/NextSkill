import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";
import FeatureHeader from "./shared/FeatureHeader";
import Card from "./shared/Card";
import CircularGraph from "./shared/CircularGraph";
import { ErrorState, LoadingState } from "./shared/RequestState";

function TopPairs({ edges }) {
  const top = [...edges].sort((a, b) => b.weight - a.weight).slice(0, 8);
  return (
    <ul className="flex flex-col gap-2">
      {top.map((edge) => (
        <li key={`${edge.source}-${edge.target}`} className="flex items-center justify-between rounded-xl border border-forest/10 bg-white/70 px-4 py-2.5 text-sm">
          <span className="font-medium text-charcoal">
            {edge.source} <span className="text-charcoal/30">+</span> {edge.target}
          </span>
          <span className="font-sans text-xs text-charcoal/50">{edge.shared_posting_count} postings together</span>
        </li>
      ))}
    </ul>
  );
}

export default function SkillNetwork() {
  const [state, setState] = useState({ status: "loading", data: null });

  useEffect(() => {
    apiGet("/skills/co-occurrence-graph", { params: { limit: 24 } }).then(({ ok, data }) => {
      setState(ok ? { status: "ready", data } : { status: "error", data: null });
    });
  }, []);

  return (
    <section className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      <FeatureHeader
        eyebrow="How skills connect"
        title="Skill Network"
        subtitle="Which skills travel together across real postings — hover a node to trace its connections."
        illustration="/illustrations/skill-network.svg"
      />

      <div className="mt-10">
        {state.status === "loading" && <LoadingState label="Building the network…" />}
        {state.status === "error" && <ErrorState message="Couldn't load the skill network." />}

        {state.status === "ready" && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_1fr]">
            <Card tone="periwinkle">
              <CircularGraph nodes={state.data.nodes} edges={state.data.edges} sizeField="mention_count" />
            </Card>
            <Card eyebrow="Strongest connections" title="Skills that travel together most" tone="lime">
              <TopPairs edges={state.data.edges} />
            </Card>
          </div>
        )}
      </div>
    </section>
  );
}
