import { useEffect, useState } from "react";
import { ArrowRight, GitBranch } from "lucide-react";
import * as api from "../../lib/api";
import { PageHeader, Card, Button, Input, Badge, LoadingState, ErrorState } from "../ui";

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

  return (
    <div>
      <PageHeader
        kicker="Explore"
        title="Role Graph"
        description="See which roles are closest to your target — and exactly which skills bridge the gap."
      />

      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(role);
          }}
          className="flex flex-wrap items-end gap-4"
        >
          <div className="min-w-[220px] flex-1">
            <Input label="Role" placeholder="e.g. Backend Developer" value={role} onChange={(e) => setRole(e.target.value)} required />
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

      <div className="mt-10">
        <div className="mb-3 flex items-center gap-2 text-forest/70">
          <GitBranch className="h-4 w-4" />
          <h2 className="font-display text-lg font-bold text-forest">All tracked roles</h2>
        </div>
        {graphError && <ErrorState message={graphError} />}
        {!graph && !graphError && <LoadingState label="Loading role network…" />}
        {graph && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {graph.nodes
              .slice()
              .sort((a, b) => b.posting_count - a.posting_count)
              .map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => runSearch(n.label)}
                  className="flex flex-col items-start rounded-xl border border-forest/10 bg-white/60 px-4 py-3 text-left transition-colors hover:border-forest/25"
                >
                  <span className="text-sm font-semibold capitalize text-forest">{n.label}</span>
                  <span className="text-xs text-forest/45">{n.posting_count.toLocaleString()} postings</span>
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
