import { useEffect, useState } from "react";
import { Share2, Copy, Check, X, TrendingUp } from "lucide-react";
import * as api from "../../lib/api";
import { PageHeader, Card, Button, Badge, LoadingState, ErrorState, EmptyState } from "../ui";
import { useToast } from "../../context/ToastContext";

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
        className="flex items-center gap-1.5 rounded-full bg-forest/8 px-3 py-1.5 text-xs font-semibold text-forest"
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

  return (
    <Card className="mb-8">
      <div className="flex items-center gap-2 text-forest/70">
        <TrendingUp className="h-4 w-4" />
        <span className="font-kicker text-xs uppercase tracking-widest">Progress</span>
      </div>
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="mt-3 h-10 rounded-xl border border-forest/15 bg-white px-3 text-sm capitalize text-forest outline-none focus:border-forest/40"
      >
        {roles.map((r) => (
          <option key={r} value={r} className="capitalize">
            {r}
          </option>
        ))}
      </select>

      {loading && <LoadingState label="Comparing your runs…" />}

      {progress && progress.runs_recorded < 2 && (
        <p className="mt-4 text-sm text-forest/55">{progress.message}</p>
      )}

      {progress && progress.runs_recorded >= 2 && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
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
      )}
    </Card>
  );
}

export default function History() {
  const toast = useToast();
  const [history, setHistory] = useState(null);
  const [sharedReports, setSharedReports] = useState(null);
  const [error, setError] = useState(null);

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

  const roles = history ? [...new Set(history.map((h) => h.resolved_role))] : [];

  return (
    <div>
      <PageHeader kicker="Account" title="History" description="Every skill-gap report you've run, and what's changed over time." />

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
                  <p className="text-xs text-forest/50">Shared {new Date(r.shared_at).toLocaleDateString()}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleRevoke(r.token)}>
                  <X className="h-3.5 w-3.5" /> Revoke
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {history && history.length === 0 && (
        <EmptyState title="No reports yet" description="Run a skill-gap report to see it appear here." />
      )}

      {history && history.length > 0 && (
        <div className="flex flex-col gap-3">
          {history.map((entry) => (
            <Card key={entry.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold capitalize text-forest">{entry.resolved_role}</p>
                  <p className="mt-1 text-xs text-forest/50">
                    {new Date(entry.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    · {entry.recommendations.length} gaps · {entry.skills_at_time.length} skills at the time
                  </p>
                </div>
                <ShareControl entryId={entry.id} onShared={loadShared} />
              </div>
              {entry.recommendations.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {entry.recommendations.slice(0, 6).map((r) => (
                    <Badge key={r.skill} tone="periwinkle">
                      {r.skill}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
