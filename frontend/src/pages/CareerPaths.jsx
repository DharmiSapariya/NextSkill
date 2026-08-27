import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { apiGet } from "../lib/api";
import PageHeader from "./shared/PageHeader";
import Card from "./shared/Card";
import CircularGraph from "./shared/CircularGraph";
import { EmptyState, ErrorState, LoadingState } from "./shared/RequestState";

function NearestRoles({ role }) {
  const [state, setState] = useState({ status: "loading", data: null });

  useEffect(() => {
    setState({ status: "loading", data: null });
    apiGet(`/roles/${encodeURIComponent(role)}/nearest`, { params: { limit: 5 } }).then(({ ok, data }) => {
      setState(ok ? { status: "ready", data } : { status: "error", data: null });
    });
  }, [role]);

  if (state.status === "loading") return <LoadingState label="Mapping the nearest roles…" />;
  if (state.status === "error") return <ErrorState message="Couldn't load nearby roles for this one." />;
  if (!state.data.nearest_roles.length) return <EmptyState message="Not enough data for this role yet." />;

  return (
    <div className="flex flex-col gap-3">
      {state.data.nearest_roles.map((path) => (
        <div key={path.role} className="rounded-xl border border-forest/10 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-display font-semibold capitalize text-charcoal">
              {role}
              <ArrowRight className="h-4 w-4 text-forest/40" />
              {path.role}
            </span>
            <span className="rounded-full bg-lime/40 px-2.5 py-0.5 text-xs font-semibold text-forest">
              {Math.round(path.similarity * 100)}% overlap
            </span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="font-sans text-[11px] font-semibold uppercase tracking-wide text-forest/50">Skills you'd keep</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {path.skills_you_have.map((s) => (
                  <span key={s} className="rounded-full bg-periwinkle/30 px-2 py-0.5 text-xs capitalize text-charcoal/70">
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="font-sans text-[11px] font-semibold uppercase tracking-wide text-forest/50">Skills you'd need</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {path.skills_you_would_need.map((s) => (
                  <span key={s} className="rounded-full bg-forest/8 px-2 py-0.5 text-xs capitalize text-charcoal/60">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CareerPaths() {
  const [graphState, setGraphState] = useState({ status: "loading", data: null });
  const [role, setRole] = useState(null);

  useEffect(() => {
    apiGet("/roles/transition-graph").then(({ ok, data }) => {
      if (ok) {
        setGraphState({ status: "ready", data });
        setRole((current) => current ?? data.nodes[0]?.id ?? null);
      } else {
        setGraphState({ status: "error", data: null });
      }
    });
  }, []);

  return (
    <section className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      <PageHeader
        eyebrow="The route, not just the destination"
        title="Career Paths"
        subtitle="Which roles are realistically one skill-gap away, built from real skill overlap — click a node to zoom in."
      />

      {graphState.status === "loading" && <LoadingState label="Mapping the role graph…" />}
      {graphState.status === "error" && <ErrorState message="Couldn't load the role-transition graph." />}

      {graphState.status === "ready" && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_1fr]">
          <Card eyebrow="Overview" title="Every tracked role, by skill overlap">
            <CircularGraph
              nodes={graphState.data.nodes}
              edges={graphState.data.edges}
              sizeField="posting_count"
              selected={role}
              onSelect={setRole}
            />
          </Card>
          <Card eyebrow="Selected role" title={role ? <span className="capitalize">{role}</span> : "Pick a role"}>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {graphState.data.nodes.map((node) => (
                <button
                  key={node.id}
                  onClick={() => setRole(node.id)}
                  className={`rounded-full px-2.5 py-1 text-xs capitalize transition-colors ${
                    role === node.id ? "bg-forest text-cream" : "bg-forest/8 text-charcoal/60 hover:bg-forest/15"
                  }`}
                >
                  {node.label}
                </button>
              ))}
            </div>
            {role && <NearestRoles role={role} />}
          </Card>
        </div>
      )}
    </section>
  );
}
