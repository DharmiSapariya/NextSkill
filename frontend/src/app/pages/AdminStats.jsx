import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  UserPlus,
  Briefcase,
  Building2,
  Tags,
  Hash,
  Share2,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  Trophy,
  Sparkles,
} from "lucide-react";
import * as api from "../../lib/api";
import { PageHeader, Card, Button, StatTile, LoadingState, ErrorState, InfoHint } from "../ui";

// Gold / silver / bronze-ish, but pulled from the app's own palette rather
// than literal medal colors — the top 3 roles get a ringed rank badge,
// everything past that falls back to a plain neutral circle.
const RANK_ACCENTS = ["var(--lime)", "var(--periwinkle)", "var(--coral)"];

function RankBadge({ rank }) {
  const accent = RANK_ACCENTS[rank - 1];
  return (
    <span
      className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-forest"
      style={{ backgroundColor: accent || "rgba(20,38,28,0.06)" }}
    >
      {rank === 1 && (
        <Trophy className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 rounded-full bg-cream p-0.5 text-forest shadow-sm" />
      )}
      {rank}
    </span>
  );
}

// A circular progress ring for a single honest ratio (real numerator over
// real denominator, both straight from the API) — same visual language as
// the match-score ring on Match & Salary, so "% of something" always reads
// the same way across the app.
function RingStat({ pct, label, sub }) {
  const value = Math.max(0, Math.min(100, pct));
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (value / 100) * circumference;
  return (
    <Card className="flex items-center gap-5">
      <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(20,38,28,0.08)" strokeWidth="9" />
          <motion.circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="var(--lime)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <span className="absolute font-display text-xl font-bold text-forest">{value.toFixed(1)}%</span>
      </div>
      <div className="min-w-0">
        <p className="font-kicker text-[11px] uppercase tracking-widest text-forest/45">{label}</p>
        <p className="mt-1 text-sm leading-snug text-forest/60">{sub}</p>
      </div>
    </Card>
  );
}

// Connects two real counts with an arrow and shows the derived ratio between
// them — every number here is total_a / total_b from the same stats payload,
// nothing invented or separately tracked.
function RelationRow({ fromIcon: FromIcon, fromLabel, toIcon: ToIcon, ratio, ratioLabel, accent }) {
  return (
    <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: accent, opacity: 0.85 }}
      >
        <FromIcon className="h-4 w-4 text-forest" />
      </span>
      <p className="min-w-0 flex-1 truncate text-sm text-forest/80">{fromLabel}</p>
      <ArrowRight className="h-4 w-4 shrink-0 text-forest/30" />
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest/8">
        <ToIcon className="h-4 w-4 text-forest/60" />
      </span>
      <div className="w-24 shrink-0 text-right">
        <p className="text-sm font-bold text-forest">{ratio}</p>
        <p className="text-[11px] leading-tight text-forest/45">{ratioLabel}</p>
      </div>
    </div>
  );
}

export default function AdminStats() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [loadedAt, setLoadedAt] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    api
      .getAdminStats()
      .then((data) => {
        setStats(data);
        setError(null);
        setLoadedAt(new Date());
      })
      .catch((e) => setError(e.message))
      .finally(() => setRefreshing(false));
  };

  useEffect(load, []);

  if (error) return <ErrorState message={error} onRetry={() => load()} />;
  if (!stats) return <LoadingState label="Loading platform stats…" />;

  const maxRequests = Math.max(1, ...stats.top_target_roles.map((r) => r.times_requested));
  const totalRequests = stats.top_target_roles.reduce((sum, r) => sum + r.times_requested, 0) || 1;
  const newUserSharePct = stats.total_users > 0 ? (stats.signups_last_30_days / stats.total_users) * 100 : 0;
  const avgJobsPerCompany = stats.total_companies > 0 ? stats.total_jobs / stats.total_companies : 0;
  const avgMentionsPerSkill = stats.total_skills > 0 ? stats.total_skill_mentions / stats.total_skills : 0;
  const avgSkillsPerJob = stats.total_jobs > 0 ? stats.total_skill_mentions / stats.total_jobs : 0;

  return (
    <div>
      <PageHeader
        kicker="Admin"
        title="Platform Stats"
        description="Aggregate numbers across the whole platform — every figure below is a live count from the database, not a projection."
        actions={
          <Button variant="secondary" size="sm" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw className={refreshing ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8 flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-2xl border border-forest/10 bg-lime/25 px-6 py-6 sm:px-8"
      >
        <div>
          <span className="flex items-center gap-1.5 font-kicker text-xs uppercase tracking-widest text-forest/50">
            <Sparkles className="h-3.5 w-3.5" /> Live snapshot
          </span>
          <p className="mt-2 max-w-xl font-display text-xl font-bold text-forest sm:text-2xl">
            {stats.total_users.toLocaleString()} users tracking {stats.total_skills.toLocaleString()} skills across{" "}
            {stats.total_jobs.toLocaleString()} real postings from {stats.total_companies.toLocaleString()} companies.
          </p>
          {loadedAt && (
            <p className="mt-2 text-xs text-forest/45">Refreshed {loadedAt.toLocaleTimeString()}</p>
          )}
        </div>
        <img src="/illustrations/9n.png" alt="" className="hidden h-28 w-28 shrink-0 object-contain sm:block" />
      </motion.div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatTile label="Total users" value={stats.total_users} icon={Users} accent="var(--periwinkle)" />
        <StatTile label="Signups (30d)" value={stats.signups_last_30_days} icon={UserPlus} accent="var(--lime)" />
        <StatTile label="Total jobs" value={stats.total_jobs} icon={Briefcase} accent="var(--coral)" />
        <StatTile label="Total companies" value={stats.total_companies} icon={Building2} accent="var(--sky)" />
        <StatTile label="Total skills" value={stats.total_skills} icon={Tags} accent="var(--amber)" />
        <StatTile label="Skill mentions" value={stats.total_skill_mentions} icon={Hash} accent="var(--violet)" />
        <StatTile label="Shared reports" value={stats.total_shared_reports} icon={Share2} accent="var(--periwinkle)" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RingStat
          pct={newUserSharePct}
          label="New users, last 30 days"
          sub={`${stats.signups_last_30_days.toLocaleString()} of ${stats.total_users.toLocaleString()} total users signed up in the last 30 days.`}
        />

        <Card>
          <div className="mb-1 flex items-center gap-2 text-forest/70">
            <TrendingUp className="h-4 w-4" />
            <span className="font-kicker text-xs uppercase tracking-widest">Platform ratios</span>
            <InfoHint text="Derived by dividing the totals above — not separately tracked metrics." />
          </div>
          <div className="flex flex-col divide-y divide-forest/10">
            <RelationRow
              fromIcon={Building2}
              fromLabel="Companies posting"
              toIcon={Briefcase}
              ratio={avgJobsPerCompany.toFixed(1)}
              ratioLabel="avg jobs / company"
              accent="var(--sky)"
            />
            <RelationRow
              fromIcon={Tags}
              fromLabel="Tracked skills"
              toIcon={Hash}
              ratio={avgMentionsPerSkill.toFixed(1)}
              ratioLabel="avg mentions / skill"
              accent="var(--amber)"
            />
            <RelationRow
              fromIcon={Briefcase}
              fromLabel="Postings ingested"
              toIcon={Hash}
              ratio={avgSkillsPerJob.toFixed(1)}
              ratioLabel="avg skills / posting"
              accent="var(--violet)"
            />
          </div>
        </Card>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="font-display text-lg font-bold text-forest">Most requested target roles</h2>
          <InfoHint text="Counts how many skill-gap reports users have actually run for each target role — the most concrete signal of what people are chasing." />
        </div>
        <Card>
          <div className="flex flex-col divide-y divide-forest/10">
            {stats.top_target_roles.map((r, i) => {
              const sharePct = (r.times_requested / totalRequests) * 100;
              const barPct = Math.max(4, (r.times_requested / maxRequests) * 100);
              return (
                <motion.div
                  key={r.role}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(i, 10) * 0.04 }}
                  className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <RankBadge rank={i + 1} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium capitalize text-forest">{r.role}</span>
                      <span className="shrink-0 text-xs font-semibold text-forest/60">
                        {r.times_requested.toLocaleString()} runs · {sharePct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-forest/8">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: RANK_ACCENTS[i] || "var(--periwinkle)" }}
                        initial={{ width: 0 }}
                        animate={{ width: `${barPct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: Math.min(i, 10) * 0.04 }}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
            {stats.top_target_roles.length === 0 && (
              <p className="py-2 text-sm text-forest/50">No report runs yet — this fills in as users try the Skill-Gap Report.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
