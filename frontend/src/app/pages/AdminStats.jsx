import { useEffect, useState } from "react";
import { Users, UserPlus, Briefcase, Building2, Tags, Hash, Share2 } from "lucide-react";
import * as api from "../../lib/api";
import { PageHeader, Card, StatTile, LoadingState, ErrorState } from "../ui";

export default function AdminStats() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getAdminStats().then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!stats) return <LoadingState label="Loading platform stats…" />;

  const maxRequests = Math.max(1, ...stats.top_target_roles.map((r) => r.times_requested));

  return (
    <div>
      <PageHeader kicker="Admin" title="Platform Stats" description="Aggregate numbers across the whole platform." />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatTile label="Total users" value={stats.total_users} icon={Users} accent="var(--periwinkle)" />
        <StatTile label="Signups (30d)" value={stats.signups_last_30_days} icon={UserPlus} accent="var(--lime)" />
        <StatTile label="Total jobs" value={stats.total_jobs} icon={Briefcase} accent="var(--coral)" />
        <StatTile label="Total companies" value={stats.total_companies} icon={Building2} accent="var(--sky)" />
        <StatTile label="Total skills" value={stats.total_skills} icon={Tags} accent="var(--amber)" />
        <StatTile label="Skill mentions" value={stats.total_skill_mentions} icon={Hash} accent="var(--violet)" />
        <StatTile label="Shared reports" value={stats.total_shared_reports} icon={Share2} accent="var(--periwinkle)" />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 font-display text-lg font-bold text-forest">Most requested target roles</h2>
        <Card>
          <div className="flex flex-col divide-y divide-forest/10">
            {stats.top_target_roles.map((r, i) => (
              <div key={r.role} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                <span className="w-5 shrink-0 text-right text-sm text-forest/30">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm capitalize text-forest">{r.role}</span>
                    <span className="shrink-0 text-xs font-semibold text-forest/60">
                      {r.times_requested.toLocaleString()} runs
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-forest/8">
                    <div
                      className="h-full rounded-full bg-periwinkle transition-all duration-700"
                      style={{ width: `${Math.max(4, (r.times_requested / maxRequests) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {stats.top_target_roles.length === 0 && <p className="text-sm text-forest/50">No data yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
