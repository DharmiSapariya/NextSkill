import { useEffect, useState } from "react";
import { ArrowRight, GitBranch } from "lucide-react";
import * as api from "../../lib/api";
import { PageHeader, Card, Button, Badge, LoadingState, ErrorState } from "../ui";
import ForceGraph from "../ForceGraph";
import Autocomplete from "../Autocomplete";
import { TRACKED_ROLES } from "../../lib/roles";

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

  const graphNodes = graph ? graph.nodes.map((n) => ({ id: n.id, label: n.label, value: n.posting_count })) : [];
  const graphEdges = graph ? graph.edges : [];

  return (
    <div>
      <PageHeader
        kicker="Explore"
        title="Role Graph"
        description="Every node is a tracked role, sized by posting volume — edges show how closely two roles' skill demands overlap. Click a role to see the closest transitions."
      />

      <Card className="p-2 sm:p-4">
        {graphError && <ErrorState message={graphError} />}
        {!graph && !graphError && <LoadingState label="Building the role network…" />}
        {graph && (
          <div className="h-[420px] w-full sm:h-[480px]">
            <ForceGraph
              nodes={graphNodes}
              edges={graphEdges}
              color="var(--lime)"
              selectedId={nearest?.role_resolution?.resolved}
              onNodeClick={(node) => runSearch(node.label)}
            />
          </div>
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
          <div className="flex items-center gap-2 text-forest/70">
            <GitBranch className="h-4 w-4" />
            <span className="font-kicker text-xs uppercase tracking-widest">
              Closest to {nearest.role_resolution?.resolved || nearest.role}
            </span>
          </div>

          {nearest.nearest_roles.length === 0 && (
            <p className="text-sm text-forest/55">No tracked-role data yet for this role.</p>
          )}
          {nearest.nearest_roles.map((r) => (
            <Card key={r.role}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-display text-base font-bold capitalize text-forest">{r.role}</h3>
                <Badge tone="lime">{Math.round(r.similarity * 100)}% similar</Badge>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <span className="font-kicker text-[11px] uppercase tracking-widest text-forest/40">
                    Skills you already have
                  </span>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.skills_you_have.slice(0, 8).map((s) => (
                      <Badge key={s}>{s}</Badge>
                    ))}
                    {r.skills_you_have.length === 0 && <span className="text-xs text-forest/40">None yet</span>}
                  </div>
                </div>
                <div>
                  <span className="font-kicker text-[11px] uppercase tracking-widest text-forest/40">
                    Skills you'd need
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
          ))}
        </div>
      )}
    </div>
  );
}
