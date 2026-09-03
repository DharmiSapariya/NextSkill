import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, Copy, Check, X, TrendingUp, ArrowRight, ExternalLink, Target, ChevronDown } from "lucide-react";
import * as api from "../../lib/api";
import { PageHeader, Card, Button, Badge, LoadingState, ErrorState, EmptyState, InfoHint } from "../ui";
import { useToast } from "../../context/ToastContext";

function timeAgo(dateString) {
  if (!dateString) return "—";
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${Math.floor(diffMonths / 12)}y ago`;
}

function ShareControl({ entryId, onShared }) {
  const toast = useToast();
  const [link, setLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    setLoading(true);
    try {
      const { share_path } = await api.shareHistoryEntry(entryId);
      const fullUrl = `${window.location.origin}${share_path}`;
      setLink(fullUrl);
      onShared?.();
      toast.success("Report shared — link ready to copy");
    } catch {
      toast.error("Couldn't share that report — try again");
    } finally {
      setLoading(false);
    }
  };

  if (link) {
    return (
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(link);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="flex items-center gap-1.5 rounded-full bg-forest/8 px-3 py-1.5 text-xs font-semibold text-forest transition-colors hover:bg-forest/14"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy link"}
      </button>
    );
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleShare} disabled={loading}>
      <Share2 className="h-3.5 w-3.5" /> {loading ? "Sharing…" : "Share"}
    </Button>
  );
}

// A small ringed count used inside the flow row — same visual language as
// the rings elsewhere in the app, sized down to sit in a horizontal chain.
function FlowCircle({ count, label, accent, textColor = "text-forest" }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center gap-1.5"
    >
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-full font-display text-lg font-bold ${textColor}`}
        style={{ backgroundColor: accent }}
      >
        {count}
      </span>
      <span className="text-center text-[11px] font-semibold uppercase leading-tight tracking-wide text-forest/45">
        {label}
      </span>
    </motion.div>
  );
}

function ProgressPanel({ roles }) {
  const [role, setRole] = useState(roles[0] || "");
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!role) return;
    setLoading(true);
    setProgress(null);
    api
      .getHistoryProgress(role)
      .then(setProgress)
      .finally(() => setLoading(false));
  }, [role]);

  if (roles.length === 0) return null;

  const startCount = progress ? progress.skills_closed.length + progress.skills_still_open.length : 0;
  const closedPct = startCount > 0 ? (progress.skills_closed.length / startCount) * 100 : 0;
  const dayGap =
    progress && progress.runs_recorded >= 2
      ? Math.max(0, Math.round((new Date(progress.latest_run_at) - new Date(progress.first_run_at)) / 86400000))
      : 0;

  return (
    <Card className="mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-forest/70">
          <TrendingUp className="h-4 w-4" />
          <span className="font-kicker text-xs uppercase tracking-widest">Progress</span>
          <InfoHint text="Compares the earliest and most recent report you've run for this role — which gap skills you've actually closed since then." />
        </div>
        {progress && progress.runs_recorded >= 2 && (
          <span className="text-xs text-forest/45">
            {new Date(progress.first_run_at).toLocaleDateString()}
            {" "}
            <ArrowRight className="inline h-3 w-3 -translate-y-px" />{" "}
            {new Date(progress.latest_run_at).toLocaleDateString()} · {dayGap} day{dayGap === 1 ? "" : "s"} apart
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {roles.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors ${
              role === r ? "bg-forest text-cream" : "bg-forest/6 text-forest/60 hover:bg-forest/12"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {loading && <LoadingState label="Comparing your runs…" />}

      {progress && progress.runs_recorded < 2 && (
        <p className="mt-4 text-sm text-forest/55">{progress.message}</p>
      )}

      {progress && progress.runs_recorded >= 2 && (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <FlowCircle count={startCount} label="Started with" accent="rgba(20,38,28,0.08)" />
            <ArrowRight className="h-4 w-4 shrink-0 text-forest/25" />
            <FlowCircle count={progress.skills_closed.length} label="Closed" accent="var(--lime)" />
            <ArrowRight className="h-4 w-4 shrink-0 text-forest/25" />
            <FlowCircle count={progress.skills_still_open.length} label="Still open" accent="var(--coral)" />
            <ArrowRight className="h-4 w-4 shrink-0 text-forest/25" />
            <FlowCircle count={progress.new_gaps.length} label="New gaps" accent="var(--periwinkle)" />
          </div>

          {startCount > 0 && (
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-forest/55">
                <span>Closed since first run</span>
                <span className="font-semibold text-forest">{closedPct.toFixed(0)}%</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-forest/8">
                <motion.div
                  className="h-full rounded-full bg-lime"
                  initial={{ width: 0 }}
                  animate={{ width: `${closedPct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <span className="text-xs font-semibold text-forest/50">Closed</span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {progress.skills_closed.length === 0 && <span className="text-xs text-forest/35">None yet</span>}
                {progress.skills_closed.map((s) => (
                  <Badge key={s} tone="green">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <span className="text-xs font-semibold text-forest/50">Still open</span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {progress.skills_still_open.map((s) => (
                  <Badge key={s}>{s}</Badge>
                ))}
              </div>
            </div>
            <div>
              <span className="text-xs font-semibold text-forest/50">New gaps</span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {progress.new_gaps.length === 0 && <span className="text-xs text-forest/35">None</span>}
                {progress.new_gaps.map((s) => (
                  <Badge key={s} tone="periwinkle">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

export default function History() {
  const toast = useToast();
  const [history, setHistory] = useState(null);
  const [sharedReports, setSharedReports] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());

  const loadShared = () => api.getMySharedReports({ limit: 50 }).then((res) => setSharedReports(res.results));

  useEffect(() => {
    api.getHistory({ limit: 50 }).then((res) => setHistory(res.results)).catch((e) => setError(e.message));
    loadShared().catch(() => {});
  }, []);

  const handleRevoke = async (token) => {
    try {
      await api.revokeSharedReport(token);
      setSharedReports((prev) => prev.filter((r) => r.token !== token));
      toast.info("Link revoked — it no longer works");
    } catch {
      toast.error("Couldn't revoke that link — try again");
    }
  };

  const toggleExpanded = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const roles = history ? [...new Set(history.map((h) => h.resolved_role))] : [];

  return (
    <div>
      <PageHeader kicker="Account" title="History" description="Every skill-gap report you've run, and what's changed over time." />

      {history && history.length > 0 && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-2xl border border-forest/10 bg-periwinkle/30 px-6 py-6 sm:px-8">
          <div>
            <span className="font-kicker text-xs uppercase tracking-widest text-forest/50">Your track record</span>
            <p className="mt-2 max-w-xl font-display text-xl font-bold text-forest sm:text-2xl">
              {history.length} report{history.length === 1 ? "" : "s"} run across {roles.length} role{roles.length === 1 ? "" : "s"}
              {sharedReports && sharedReports.length > 0 ? `, ${sharedReports.length} published` : ""}.
            </p>
          </div>
          <img src="/illustrations/10n.png" alt="" className="hidden h-28 w-28 shrink-0 object-contain sm:block" />
        </div>
      )}

      {error && <ErrorState message={error} />}
      {!history && !error && <LoadingState label="Loading your history…" />}

      {history && <ProgressPanel roles={roles} />}

      {sharedReports && sharedReports.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 font-display text-lg font-bold text-forest">Published links</h2>
          <div className="flex flex-col gap-2">
            {sharedReports.map((r) => (
              <Card key={r.token} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-semibold capitalize text-forest">{r.resolved_role}</p>
                  <p className="text-xs text-forest/50">Shared {timeAgo(r.shared_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={r.share_path}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-forest/60 transition-colors hover:bg-forest/6 hover:text-forest"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Open
                  </a>
                  <Button variant="ghost" size="sm" onClick={() => handleRevoke(r.token)}>
                    <X className="h-3.5 w-3.5" /> Revoke
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {history && history.length === 0 && (
        <EmptyState
          title="No reports yet"
          description="Run a skill-gap report to see it appear here."
          action={
            <Button as={Link} to="/app/report" size="sm" className="mt-2">
              Run a report
            </Button>
          }
        />
      )}

      {history && history.length > 0 && (
        <div className="flex flex-col gap-3">
          {history.map((entry, i) => {
            const isExpanded = expanded.has(entry.id);
            const visibleRecs = isExpanded ? entry.recommendations : entry.recommendations.slice(0, 6);
            const hiddenCount = entry.recommendations.length - visibleRecs.length;
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i, 10) * 0.025 }}
              >
                <Card>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest/8">
                        <Target className="h-4 w-4 text-forest/60" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold capitalize text-forest">{entry.resolved_role}</p>
                        <p className="mt-0.5 text-xs text-forest/50">
                          {timeAgo(entry.created_at)} · {entry.recommendations.length} gap
                          {entry.recommendations.length === 1 ? "" : "s"} · {entry.skills_at_time.length} skill
                          {entry.skills_at_time.length === 1 ? "" : "s"} at the time
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button as={Link} to={`/app/report?role=${encodeURIComponent(entry.target_role)}`} variant="ghost" size="sm">
                        Run again
                      </Button>
                      <ShareControl entryId={entry.id} onShared={loadShared} />
                    </div>
                  </div>

                  {entry.recommendations.length > 0 && (
                    <>
                      <AnimatePresence initial={false}>
                        <motion.div layout className="mt-3 flex flex-wrap gap-1.5">
                          {visibleRecs.map((r) => (
                            <Badge key={r.skill} tone="periwinkle">
                              {r.skill}
                              {r.market_demand_pct != null && (
                                <span className="ml-1 text-forest/50">· {r.market_demand_pct}%</span>
                              )}
                            </Badge>
                          ))}
                        </motion.div>
                      </AnimatePresence>
                      {hiddenCount > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(entry.id)}
                          className="mt-2 flex items-center gap-1 text-xs font-semibold text-forest/50 hover:text-forest"
                        >
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          {isExpanded ? "Show fewer" : `+${hiddenCount} more`}
                        </button>
                      )}
                    </>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
