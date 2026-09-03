import { useEffect, useState } from "react";
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

  return (
    <div>
      <PageHeader kicker="Admin" title="Platform Stats" description="Aggregate numbers across the whole platform." />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatTile label="Total users" value={stats.total_users.toLocaleString()} />
        <StatTile label="Signups (30d)" value={stats.signups_last_30_days.toLocaleString()} />
        <StatTile label="Total jobs" value={stats.total_jobs.toLocaleString()} />
        <StatTile label="Total companies" value={stats.total_companies.toLocaleString()} />
        <StatTile label="Total skills" value={stats.total_skills.toLocaleString()} />
        <StatTile label="Skill mentions" value={stats.total_skill_mentions.toLocaleString()} />
        <StatTile label="Shared reports" value={stats.total_shared_reports.toLocaleString()} />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 font-display text-lg font-bold text-forest">Most requested target roles</h2>
        <Card>
          <div className="flex flex-col divide-y divide-forest/10">
            {stats.top_target_roles.map((r, i) => (
              <div key={r.role} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <span className="flex items-center gap-3 text-sm text-forest">
                  <span className="w-5 text-right text-forest/30">{i + 1}</span>
                  <span className="capitalize">{r.role}</span>
                </span>
                <span className="text-xs font-semibold text-forest/60">{r.times_requested.toLocaleString()} runs</span>
              </div>
            ))}
            {stats.top_target_roles.length === 0 && <p className="text-sm text-forest/50">No data yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
