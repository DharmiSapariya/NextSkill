import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Target, FileUp, Gauge, ArrowRight, Sparkles, Layers, History as HistoryIcon } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import * as api from "../../lib/api";
import { Card, Button, LoadingState, ErrorState, EmptyState, Badge, StatTile } from "../ui";

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

export default function Overview() {
  const { user } = useAuth();
  const [history, setHistory] = useState(null);
  const [digest, setDigest] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getHistory({ limit: 5 }), api.getDigest()])
      .then(([historyRes, digestRes]) => {
        if (cancelled) return;
        setHistory(historyRes);
        setDigest(digestRes);
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-2xl border border-forest/10 bg-periwinkle/40 px-6 py-6 sm:px-8">
        <div>
          <span className="font-kicker text-xs uppercase tracking-widest text-forest/50">Overview</span>
          <h1 className="mt-1 font-display text-[clamp(1.5rem,3vw,2.25rem)] font-bold text-forest">
            {`Welcome back${user?.email ? `, ${user.email.split("@")[0]}` : ""}.`}
          </h1>
          <p className="mt-2 max-w-md text-sm text-forest/65">
            Everything you need to plan your next move, in one place.
          </p>
        </div>
        <img src="/illustrations/18n.png" alt="" className="hidden h-32 w-32 shrink-0 object-contain sm:block" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
      </div>

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
                  <p className="mt-1 text-xs text-forest/60">
                    Top gap skill moved from <Badge tone="periwinkle">{c.previous_top_gap_skill}</Badge> to{" "}
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
