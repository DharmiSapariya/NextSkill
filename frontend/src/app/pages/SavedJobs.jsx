import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, BookmarkX, Building2, X, ArrowUpDown, LayoutGrid, Rows3 } from "lucide-react";
import * as api from "../../lib/api";
import { PageHeader, Card, Button, Input, LoadingState, ErrorState, EmptyState } from "../ui";
import { useToast } from "../../context/ToastContext";

const SORT_OPTIONS = [
  { key: "newest", label: "Newest saved" },
  { key: "oldest", label: "Oldest saved" },
  { key: "title", label: "Title A–Z" },
  { key: "company", label: "Company A–Z" },
];

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

function MatchBadge({ match }) {
  if (!match || match.match_pct == null) return null;
  const pct = match.match_pct;
  const color = pct >= 60 ? "var(--lime)" : pct >= 30 ? "var(--amber)" : "var(--coral)";
  return (
    <span
      className="flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold text-forest"
      style={{ backgroundColor: color, opacity: 0.85 }}
      title="Match against your current saved skills"
    >
      {pct}% match
    </span>
  );
}

function JobRow({ job, selected, onToggleSelect, onRemove, removing, match }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
      <Card className={`flex flex-wrap items-center gap-3 transition-colors ${selected ? "border-forest/30 bg-forest/5" : ""}`}>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="h-4 w-4 shrink-0 cursor-pointer rounded accent-forest"
          aria-label={`Select ${job.title || "job"}`}
        />
        <Link to={`/app/jobs/${job.job_id}`} className="min-w-0 flex-1">
          <h3 className="font-display text-base font-bold text-forest">{job.title || "Untitled posting"}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-forest/55">
            {job.company && <span>{job.company}</span>}
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {job.location}
              </span>
            )}
            <span>Saved {timeAgo(job.saved_at)}</span>
          </p>
        </Link>
        <MatchBadge match={match} />
        <Button variant="ghost" size="sm" onClick={onRemove} disabled={removing}>
          <BookmarkX className="h-4 w-4" /> Remove
        </Button>
      </Card>
    </motion.div>
  );
}

export default function SavedJobs() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [removingIds, setRemovingIds] = useState(() => new Set());
  const [matches, setMatches] = useState({});

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("newest");
  const [grouped, setGrouped] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const load = () => {
    setError(null);
    api
      .getSavedJobs({ limit: 100 })
      .then(setData)
      .catch((e) => setError(e.message));
  };

  useEffect(load, []);

  useEffect(() => {
    if (!data || data.results.length === 0) return;
    let cancelled = false;
    Promise.allSettled(data.results.map((j) => api.getJobMatch(j.job_id))).then((results) => {
      if (cancelled) return;
      const map = {};
      results.forEach((r, i) => {
        if (r.status === "fulfilled") map[data.results[i].job_id] = r.value;
      });
      setMatches(map);
    });
    return () => {
      cancelled = true;
    };
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    let rows = data.results;
    if (q) {
      rows = rows.filter((j) => [j.title, j.company, j.location].filter(Boolean).some((v) => v.toLowerCase().includes(q)));
    }
    rows = [...rows].sort((a, b) => {
      if (sortKey === "newest") return new Date(b.saved_at) - new Date(a.saved_at);
      if (sortKey === "oldest") return new Date(a.saved_at) - new Date(b.saved_at);
      if (sortKey === "title") return (a.title || "").localeCompare(b.title || "");
      if (sortKey === "company") return (a.company || "").localeCompare(b.company || "");
      return 0;
    });
    return rows;
  }, [data, query, sortKey]);

  const groupedEntries = useMemo(() => {
    const map = new Map();
    filtered.forEach((j) => {
      const key = j.company || "Unknown company";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(j);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const toggleSelect = (jobId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const allSelected = filtered.length > 0 && filtered.every((j) => selectedIds.has(j.job_id));
  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) filtered.forEach((j) => next.delete(j.job_id));
      else filtered.forEach((j) => next.add(j.job_id));
      return next;
    });
  };

  const removeJobs = async (jobs) => {
    const ids = jobs.map((j) => j.job_id);
    setRemovingIds((prev) => new Set([...prev, ...ids]));
    try {
      await Promise.all(ids.map((id) => api.unsaveJob(id)));
      setData((prev) => ({ ...prev, results: prev.results.filter((j) => !ids.includes(j.job_id)) }));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      toast.info(jobs.length === 1 ? "Removed from saved jobs" : `${jobs.length} jobs removed`, {
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              await Promise.all(ids.map((id) => api.saveJob(id)));
              setData((prev) => ({ ...prev, results: [...jobs, ...prev.results] }));
              toast.success("Restored");
            } catch {
              toast.error("Couldn't restore — try again");
            }
          },
        },
      });
    } catch {
      toast.error("Couldn't remove — try again");
    } finally {
      setRemovingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }
  };

  return (
    <div>
      <PageHeader kicker="Explore" title="Saved Jobs" description="Postings you've bookmarked for later." />

      {data && data.results.length > 0 && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-2xl border border-forest/10 bg-violet/25 px-6 py-6 sm:px-8">
          <div>
            <span className="font-kicker text-xs uppercase tracking-widest text-forest/50">Your shortlist</span>
            <p className="mt-2 max-w-xl font-display text-xl font-bold text-forest sm:text-2xl">
              {data.results.length} posting{data.results.length === 1 ? "" : "s"} bookmarked
              {Object.keys(matches).length > 0 &&
                ` — match scores update live against your current saved skills`}
              .
            </p>
          </div>
          <img src="/illustrations/15n.png" alt="" className="hidden h-28 w-28 shrink-0 object-contain sm:block" />
        </div>
      )}

      {error && <ErrorState message={error} onRetry={load} />}
      {!data && !error && <LoadingState label="Loading your saved jobs…" />}

      {data && data.results.length === 0 && (
        <EmptyState
          title="No saved jobs yet"
          description="Bookmark postings from the Jobs page to keep track of ones you're interested in."
          action={
            <Button as={Link} to="/app/jobs" size="sm" className="mt-2">
              Browse Jobs
            </Button>
          }
        />
      )}

      {data && data.results.length > 0 && (
        <>
          <Card className="flex flex-wrap items-end gap-4">
            <div className="min-w-[200px] flex-1">
              <Input
                label="Search saved jobs"
                placeholder="Title, company, or location"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-forest/70">Sort by</span>
              <div className="relative">
                <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-forest/35" />
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value)}
                  className="h-11 rounded-xl border border-forest/15 bg-white pl-8 pr-3 text-sm text-forest outline-none focus:border-forest/40"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </label>
            <Button type="button" variant="secondary" size="md" onClick={() => setGrouped((v) => !v)}>
              {grouped ? <Rows3 className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
              {grouped ? "Flat list" : "Group by company"}
            </Button>
          </Card>

          <div className="mt-3 flex items-center gap-3 px-1">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="h-4 w-4 cursor-pointer rounded accent-forest"
              aria-label="Select all"
            />
            <span className="text-xs text-forest/50">
              {filtered.length} of {data.results.length} shown
            </span>
          </div>

          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-2 flex flex-wrap items-center gap-3 rounded-2xl border border-forest/15 bg-forest px-4 py-3 text-cream">
                  <span className="text-sm font-semibold">{selectedIds.size} selected</span>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="border-cream/30 text-cream hover:bg-cream/10"
                    onClick={() => removeJobs(data.results.filter((j) => selectedIds.has(j.job_id)))}
                  >
                    <BookmarkX className="h-3.5 w-3.5" /> Remove selected
                  </Button>
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="ml-auto flex items-center gap-1 text-xs text-cream/70 hover:text-cream"
                  >
                    <X className="h-3.5 w-3.5" /> Clear
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {filtered.length === 0 && (
            <div className="mt-6">
              <EmptyState title="No matches" description="Try a different search term." />
            </div>
          )}

          {!grouped && filtered.length > 0 && (
            <div className="mt-4 flex flex-col gap-3">
              <AnimatePresence>
                {filtered.map((job) => (
                  <JobRow
                    key={job.job_id}
                    job={job}
                    selected={selectedIds.has(job.job_id)}
                    onToggleSelect={() => toggleSelect(job.job_id)}
                    onRemove={() => removeJobs([job])}
                    removing={removingIds.has(job.job_id)}
                    match={matches[job.job_id]}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {grouped && filtered.length > 0 && (
            <div className="mt-4 flex flex-col gap-6">
              {groupedEntries.map(([company, jobs]) => (
                <div key={company}>
                  <div className="mb-2 flex items-center gap-2 text-forest/70">
                    <Building2 className="h-4 w-4" />
                    <span className="text-sm font-semibold text-forest">{company}</span>
                    <span className="text-xs text-forest/45">
                      {jobs.length} job{jobs.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3">
                    <AnimatePresence>
                      {jobs.map((job) => (
                        <JobRow
                          key={job.job_id}
                          job={job}
                          selected={selectedIds.has(job.job_id)}
                          onToggleSelect={() => toggleSelect(job.job_id)}
                          onRemove={() => removeJobs([job])}
                          removing={removingIds.has(job.job_id)}
                          match={matches[job.job_id]}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
