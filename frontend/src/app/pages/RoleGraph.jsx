import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, GitBranch, X, Waypoints } from "lucide-react";
import * as api from "../../lib/api";
import { PageHeader, Card, Button, Badge, LoadingState, ErrorState, InfoHint } from "../ui";
import ForceGraph from "../ForceGraph";
import Autocomplete from "../Autocomplete";
import { TRACKED_ROLES } from "../../lib/roles";

const RANK_ACCENTS = ["var(--lime)", "var(--periwinkle)", "var(--coral)"];

function RankDot({ rank }) {
  return (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-forest"
      style={{ backgroundColor: RANK_ACCENTS[rank - 1] || "rgba(20,38,28,0.08)" }}
    >
      {rank}
    </span>
  );
}

function SimilarityBar({ pct }) {
  return (
    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-forest/8">
      <motion.div
        className="h-full rounded-full bg-lime"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      />
    </div>
  );
}

export default function RoleGraph() {
  const [graph, setGraph] = useState(null);
  const [graphError, setGraphError] = useState(null);

  const [role, setRole] = useState("");
  const [nearest, setNearest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getTransitionGraph().then(setGraph).catch((e) => setGraphError(e.message));
  }, []);

  const runSearch = async (targetRole) => {
    if (!targetRole.trim()) return;
    setRole(targetRole);
    setLoading(true);
    setError(null);
    setNearest(null);
    try {
      const data = await api.getNearestRoles(targetRole, 6);
      setNearest(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearSelection = () => {
    setRole("");
    setNearest(null);
    setError(null);
  };

  const graphNodes = graph ? graph.nodes.map((n) => ({ id: n.id, label: n.label, value: n.posting_count })) : [];
  const graphEdges = graph ? graph.edges : [];

  const selectedRole = nearest?.role_resolution?.resolved;
  const connectedCount =
    graph && selectedRole ? graph.edges.filter((e) => e.source === selectedRole || e.target === selectedRole).length : 0;

  return (
    <div>
      <PageHeader
        kicker="Explore"
        title="Role Graph"
        description="Every node is a tracked role, sized by posting volume — edges show how closely two roles' skill demands overlap. Click a role to see the closest transitions."
      />

      <div className="mb-8 flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-2xl border border-forest/10 bg-lime/20 px-6 py-6 sm:px-8">
        <div>
          <span className="font-kicker text-xs uppercase tracking-widest text-forest/50">Career paths</span>
          <p className="mt-2 max-w-xl font-display text-xl font-bold text-forest sm:text-2xl">
            {graph ? `${graph.nodes.length} tracked roles` : "Tracked roles"} connected by real skill overlap — find your
            nearest transition.
          </p>
        </div>
        <img src="/illustrations/1N.png" alt="" className="hidden h-28 w-28 shrink-0 object-contain sm:block" />
      </div>

      <Card className="p-2 sm:p-4">
        {graphError && <ErrorState message={graphError} />}
        {!graph && !graphError && <LoadingState label="Building the role network…" />}
        {graph && (
          <>
            <div className="h-[420px] w-full sm:h-[480px]">
              <ForceGraph
                nodes={graphNodes}
                edges={graphEdges}
                color="var(--lime)"
                selectedId={selectedRole}
                onNodeClick={(node) => runSearch(node.label)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-4 border-t border-forest/10 px-2 pt-3 text-[11px] text-forest/50">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-lime" />
                <span className="h-3.5 w-3.5 rounded-full bg-lime" />
                Node size = posting volume
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-5 bg-forest/40" />
                Edge = shared skill overlap
              </span>
              <InfoHint text="Only role pairs above a similarity threshold get an edge — not every role is connected to every other." />
            </div>
          </>
        )}
      </Card>

      <Card className="mt-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(role);
          }}
          className="flex flex-wrap items-end gap-4"
        >
          <div className="min-w-[220px] flex-1">
            <Autocomplete
              label="Or search a role directly"
              placeholder="e.g. Backend Developer"
              value={role}
              onChange={setRole}
              onSelect={setRole}
              getOptions={(q) => TRACKED_ROLES.filter((r) => r.includes(q.trim().toLowerCase())).slice(0, 8)}
            />
          </div>
          <Button type="submit" disabled={loading || !role.trim()}>
            {loading ? "Finding…" : "Find nearest roles"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>
      </Card>

      {loading && <LoadingState label="Comparing skill vectors across tracked roles…" />}
      {error && <ErrorState message={error} />}

      {nearest && (
        <div className="mt-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-forest/70">
              <GitBranch className="h-4 w-4" />
              <span className="font-kicker text-xs uppercase tracking-widest">
                Closest to {selectedRole || nearest.role}
              </span>
              {connectedCount > 0 && (
                <span className="flex items-center gap-1 text-xs font-normal normal-case text-forest/45">
                  <Waypoints className="h-3 w-3" /> connected to {connectedCount} role{connectedCount === 1 ? "" : "s"} in the graph
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={clearSelection}
              className="flex items-center gap-1 text-xs font-semibold text-forest/45 hover:text-forest/70"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          </div>

          {nearest.nearest_roles.length === 0 && (
            <p className="text-sm text-forest/55">No tracked-role data yet for this role.</p>
          )}
          {nearest.nearest_roles.map((r, i) => (
            <motion.div key={r.role} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: i * 0.04 }}>
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {i < 3 && <RankDot rank={i + 1} />}
                    <h3 className="font-display text-base font-bold capitalize text-forest">{r.role}</h3>
                  </div>
                  <Button
                    as="a"
                    href={`/app/match?role=${encodeURIComponent(r.role)}`}
                    variant="ghost"
                    size="sm"
                  >
                    Check match &amp; salary <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="mt-1">
                  <div className="flex items-center justify-between text-xs text-forest/55">
                    <span>Skill overlap</span>
                    <span className="font-semibold text-forest">{Math.round(r.similarity * 100)}%</span>
                  </div>
                  <SimilarityBar pct={r.similarity * 100} />
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <span className="font-kicker text-[11px] uppercase tracking-widest text-forest/40">
                      Overlapping skills
                    </span>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {r.skills_you_have.slice(0, 8).map((s) => (
                        <Badge key={s}>{s}</Badge>
                      ))}
                      {r.skills_you_have.length === 0 && <span className="text-xs text-forest/40">None yet</span>}
                    </div>
                  </div>
                  <div>
                    <span className="flex items-center gap-1.5 font-kicker text-[11px] uppercase tracking-widest text-forest/40">
                      Skills to bridge the gap
                      <InfoHint text="Ordered by how important each skill is to the target role — the first one matters most." />
                    </span>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {r.skills_you_would_need.slice(0, 8).map((s) => (
                        <Badge key={s} tone="periwinkle">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
