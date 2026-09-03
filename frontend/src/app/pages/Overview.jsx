import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Target,
  FileUp,
  Gauge,
  ArrowRight,
  Sparkles,
  Layers,
  History as HistoryIcon,
  Bookmark,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import * as api from "../../lib/api";
import { Card, Button, LoadingState, ErrorState, EmptyState, Badge, StatTile } from "../ui";
import { CATEGORY_COLORS, categoryFor } from "../../lib/skillCategories";

const quickActions = [
  {
    to: "/app/report",
    icon: Target,
    title: "Run a skill-gap report",
    description: "Compare your skills against real postings for any target role.",
  },
  {
    to: "/app/resume",
    icon: FileUp,
    title: "Upload your resume",
    description: "Auto-parse your skills from a PDF or DOCX in seconds.",
  },
  {
    to: "/app/match",
    icon: Gauge,
    title: "Check your match score",
    description: "See what % of postings you'd be a strong match for.",
  },
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// Derived entirely from the user's own saved skills list — no separate
// endpoint, just categoryFor() applied client-side (same taxonomy used to
// color chips everywhere else in the app).
function SkillMix({ skills }) {
  if (!skills || skills.length === 0) return null;
  const counts = {};
  skills.forEach((s) => {
    const cat = categoryFor(s);
    counts[cat] = (counts[cat] || 0) + 1;
  });
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const total = skills.length;

  return (
    <Card>
      <div className="flex items-center gap-2 text-forest/70">
        <Layers className="h-4 w-4" />
        <span className="font-kicker text-xs uppercase tracking-widest">Your skill mix</span>
      </div>
      <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-forest/8">
        {entries.map(([cat, n]) => (
          <motion.div
            key={cat}
            initial={{ width: 0 }}
            animate={{ width: `${(n / total) * 100}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            style={{ backgroundColor: CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other }}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-forest/55">
        {entries.map(([cat, n]) => (
          <span key={cat} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other }} />
            {cat} · {n}
          </span>
        ))}
      </div>
    </Card>
  );
}

export default function Overview() {
  const { user } = useAuth();
  const [history, setHistory] = useState(null);
  const [digest, setDigest] = useState(null);
  const [savedCount, setSavedCount] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getHistory({ limit: 5 }), api.getDigest(), api.getSavedJobs({ limit: 1 })])
      .then(([historyRes, digestRes, savedRes]) => {
        if (cancelled) return;
        setHistory(historyRes);
        setDigest(digestRes);
        setSavedCount(savedRes.total);
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const latest = history?.results?.[0];

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-2xl border border-forest/10 bg-periwinkle/40 px-6 py-6 sm:px-8">
        <div>
          <span className="font-kicker text-xs uppercase tracking-widest text-forest/50">Overview</span>
          <h1 className="mt-1 font-display text-[clamp(1.5rem,3vw,2.25rem)] font-bold text-forest">
            {`${greeting()}${user?.email ? `, ${user.email.split("@")[0]}` : ""}.`}
          </h1>
          <p className="mt-2 max-w-md text-sm text-forest/65">
            Everything you need to plan your next move, in one place.
          </p>
        </div>
        <img src="/illustrations/18n.png" alt="" className="hidden h-32 w-32 shrink-0 object-contain sm:block" />
      </div>

      {latest && (
        <Card className="mb-8 flex flex-wrap items-center justify-between gap-4 border-forest/15">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-periwinkle/50">
              <Target className="h-4 w-4 text-forest" />
            </span>
            <div className="min-w-0">
              <p className="font-kicker text-[11px] uppercase tracking-widest text-forest/40">Jump back in</p>
              <p className="truncate text-sm font-semibold capitalize text-forest">Continue with {latest.resolved_role}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button as={Link} to={`/app/report?role=${encodeURIComponent(latest.target_role)}`} variant="secondary" size="sm">
              Run again
            </Button>
            <Button as={Link} to={`/app/match?role=${encodeURIComponent(latest.target_role)}`} size="sm">
              Check match &amp; salary <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Your skills"
          value={user?.skills?.length ?? 0}
          sub="tracked in your profile"
          icon={Layers}
          accent="var(--periwinkle)"
        />
        <StatTile
          label="Plan"
          value={<span className="capitalize">{user?.tier ?? "free"}</span>}
          icon={Sparkles}
          accent="var(--lime)"
        />
        <StatTile
          label="Reports run"
          value={history ? history.results.length : "—"}
          sub="most recent 5 shown below"
          icon={HistoryIcon}
          accent="var(--coral)"
        />
        <Link to="/app/saved-jobs" className="block">
          <StatTile label="Saved jobs" value={savedCount ?? "—"} sub="bookmarked postings" icon={Bookmark} accent="var(--sky)" />
        </Link>
      </div>

      {user?.skills?.length > 0 && (
        <div className="mt-4">
          <SkillMix skills={user.skills} />
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {quickActions.map((action) => (
          <Link key={action.to} to={action.to}>
            <Card className="group flex h-full flex-col gap-3 transition-colors hover:border-forest/25">
              <action.icon className="h-6 w-6 text-forest" />
              <div className="flex-1">
                <h3 className="font-display text-base font-bold text-forest">{action.title}</h3>
                <p className="mt-1 text-sm text-forest/60">{action.description}</p>
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold text-forest/70 transition-transform group-hover:translate-x-1">
                Go <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Card>
          </Link>
        ))}
      </div>

      {error && <ErrorState message={error} />}

      {digest && digest.changes?.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 font-display text-lg font-bold text-forest">What's changed since you last looked</h2>
          <div className="flex flex-col gap-3">
            {digest.changes.map((c) => (
              <Card key={c.resolved_role} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold capitalize text-forest">{c.resolved_role}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-forest/60">
                    Top gap skill moved from <Badge tone="periwinkle">{c.previous_top_gap_skill}</Badge>
                    <ArrowRight className="h-3 w-3 text-forest/35" />
                    <Badge tone="lime">{c.current_top_gap_skill}</Badge>
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-forest">Recent reports</h2>
          <Button as={Link} to="/app/history" variant="ghost" size="sm">
            View all
          </Button>
        </div>

        {!history && !error && <LoadingState label="Loading your recent activity…" />}

        {history && history.results.length === 0 && (
          <EmptyState
            title="No reports yet"
            description="Run your first skill-gap report to see it here."
            action={
              <Button as={Link} to="/app/report" size="sm" className="mt-2">
                Run a report
              </Button>
            }
          />
        )}

        {history && history.results.length > 0 && (
          <div className="flex flex-col gap-3">
            {history.results.map((entry) => (
              <Card key={entry.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold capitalize text-forest">{entry.resolved_role}</p>
                  <p className="mt-1 text-xs text-forest/50">
                    {new Date(entry.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    · {entry.recommendations.length} gap skills found
                  </p>
                </div>
                <Badge>{entry.recommendations.length} gaps</Badge>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
