import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, ArrowRight, ArrowLeft, Bookmark, BookmarkCheck, X, Loader2 } from "lucide-react";
import * as api from "../../lib/api";
import { PageHeader, Card, Button, Input, Badge, LoadingState, ErrorState, EmptyState } from "../ui";
import Autocomplete from "../Autocomplete";
import { TRACKED_ROLES } from "../../lib/roles";
import { useToast } from "../../context/ToastContext";

const SENIORITY_OPTIONS = [
  { key: "", label: "Any" },
  { key: "junior", label: "Junior" },
  { key: "mid", label: "Mid" },
  { key: "senior", label: "Senior" },
  { key: "unspecified", label: "Unspecified" },
];

const SENIORITY_COLORS = { junior: "var(--sky)", mid: "var(--amber)", senior: "var(--coral)", unspecified: "rgba(20,38,28,0.1)" };
const TAG_COLORS = ["var(--periwinkle)", "var(--lime)", "var(--coral)", "var(--sky)", "var(--amber)", "var(--violet)"];
const PAGE_SIZE = 20;

function tagColor(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return TAG_COLORS[hash % TAG_COLORS.length];
}

// Honest, page-scoped only — counts seniority across the results currently
// on screen, never claimed as a platform-wide distribution.
function SeniorityMix({ jobs }) {
  const counts = { junior: 0, mid: 0, senior: 0, unspecified: 0 };
  jobs.forEach((j) => {
    counts[j.seniority && counts[j.seniority] != null ? j.seniority : "unspecified"] += 1;
  });
  const total = jobs.length || 1;
  const segments = Object.entries(counts).filter(([, n]) => n > 0);
  if (segments.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex h-2 overflow-hidden rounded-full bg-forest/8">
        {segments.map(([key, n]) => (
          <motion.div
            key={key}
            initial={{ width: 0 }}
            animate={{ width: `${(n / total) * 100}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            style={{ backgroundColor: SENIORITY_COLORS[key] }}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-forest/50">
        {segments.map(([key, n]) => (
          <span key={key} className="flex items-center gap-1.5 capitalize">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SENIORITY_COLORS[key] }} />
            {key} · {n} on this page
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Jobs() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const role = searchParams.get("role") || "";
  const location = searchParams.get("location") || "";
  const seniority = searchParams.get("seniority") || "";
  const page = parseInt(searchParams.get("page") || "0", 10);

  const [liveRole, setLiveRole] = useState(role);
  const [liveLocation, setLiveLocation] = useState(location);
  const roleDebounceRef = useRef(null);
  const locationDebounceRef = useRef(null);

  const [data, setData] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);
  const [savedIds, setSavedIds] = useState(() => new Set());
  const [saveBusyId, setSaveBusyId] = useState(null);

  useEffect(() => {
    api
      .getSavedJobs({ limit: 100 })
      .then((res) => setSavedIds(new Set(res.results.map((j) => String(j.job_id)))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setFetching(true);
    setError(null);
    const params = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
    if (role) params.role = role;
    if (location) params.location = location;
    if (seniority) params.seniority = seniority;

    api
      .getJobs(params)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setFetching(false));
  }, [role, location, seniority, page]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setSearchParams(next);
  };

  const clearFilter = (key) => {
    if (key === "role") setLiveRole("");
    if (key === "location") setLiveLocation("");
    updateParam(key, "");
  };

  const clearAllFilters = () => {
    setLiveRole("");
    setLiveLocation("");
    setSearchParams({});
  };

  const handleLiveRole = (value) => {
    setLiveRole(value);
    clearTimeout(roleDebounceRef.current);
    roleDebounceRef.current = setTimeout(() => updateParam("role", value), 250);
  };

  const handleLiveLocation = (value) => {
    setLiveLocation(value);
    clearTimeout(locationDebounceRef.current);
    locationDebounceRef.current = setTimeout(() => updateParam("location", value), 250);
  };

  const goToPage = (p) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", p);
    setSearchParams(next);
  };

  const toggleSave = async (e, job) => {
    e.preventDefault();
    e.stopPropagation();
    setSaveBusyId(job.id);
    const isSaved = savedIds.has(String(job.id));
    try {
      if (isSaved) {
        await api.unsaveJob(job.id);
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.delete(String(job.id));
          return next;
        });
        toast.info("Removed from saved jobs");
      } else {
        await api.saveJob(job.id);
        setSavedIds((prev) => new Set(prev).add(String(job.id)));
        toast.success("Saved — find it under Saved Jobs");
      }
    } catch {
      toast.error("Couldn't update saved status — try again");
    } finally {
      setSaveBusyId(null);
    }
  };

  const activeFilters = [
    role && { key: "role", label: `Role: ${role}` },
    location && { key: "location", label: `Location: ${location}` },
    seniority && { key: "seniority", label: `Seniority: ${seniority}` },
  ].filter(Boolean);

  return (
    <div>
      <PageHeader kicker="Explore" title="Jobs" description="Browse real postings we've ingested." />

      <div className="mb-8 flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-2xl border border-forest/10 bg-amber/20 px-6 py-6 sm:px-8">
        <div>
          <span className="font-kicker text-xs uppercase tracking-widest text-forest/50">Live postings</span>
          <p className="mt-2 max-w-xl font-display text-xl font-bold text-forest sm:text-2xl">
            {data ? `${data.total.toLocaleString()} postings` : "Postings"} match your current filters right now.
          </p>
        </div>
        <img src="/illustrations/14n.png" alt="" className="hidden h-28 w-28 shrink-0 object-contain sm:block" />
      </div>

      <Card className="flex flex-wrap items-end gap-4">
        <div className="min-w-[200px] flex-1">
          <Autocomplete
            label="Role keyword"
            placeholder="e.g. Data Analyst"
            value={liveRole}
            onChange={handleLiveRole}
            onSelect={(v) => {
              setLiveRole(v);
              updateParam("role", v);
            }}
            getOptions={(q) => TRACKED_ROLES.filter((r) => r.includes(q.trim().toLowerCase())).slice(0, 8)}
          />
        </div>
        <div className="min-w-[200px] flex-1">
          <Input
            label="Location keyword"
            placeholder="e.g. Remote — filters live"
            value={liveLocation}
            onChange={(e) => handleLiveLocation(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-forest/70">Seniority</span>
          <div className="flex flex-wrap gap-1.5">
            {SENIORITY_OPTIONS.map((s) => (
              <button
                key={s.key || "any"}
                type="button"
                onClick={() => updateParam("seniority", s.key)}
                className={`rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                  seniority === s.key ? "bg-forest text-cream" : "bg-forest/6 text-forest/60 hover:bg-forest/12"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {activeFilters.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {activeFilters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => clearFilter(f.key)}
              className="flex items-center gap-1.5 rounded-full bg-forest/8 px-3 py-1 text-xs font-medium text-forest transition-colors hover:bg-forest/14"
            >
              {f.label} <X className="h-3 w-3" />
            </button>
          ))}
          <button type="button" onClick={clearAllFilters} className="text-xs font-semibold text-forest/45 hover:text-forest/70">
            Clear all
          </button>
        </div>
      )}

      <div className="mt-6">
        {fetching && !data && <LoadingState label="Loading postings…" />}
        {error && <ErrorState message={error} />}

        {data && data.results.length === 0 && (
          <EmptyState
            title="No postings match those filters"
            description="Try broadening your search."
            action={
              activeFilters.length > 0 && (
                <Button size="sm" variant="secondary" onClick={clearAllFilters}>
                  Clear filters
                </Button>
              )
            }
          />
        )}

        {data && data.results.length > 0 && (
          <motion.div animate={{ opacity: fetching ? 0.5 : 1 }} transition={{ duration: 0.15 }}>
            <div className="mb-3 flex items-center gap-2">
              <p className="text-xs text-forest/50">{data.total.toLocaleString()} postings found</p>
              {fetching && (
                <span className="flex items-center gap-1 text-xs text-forest/40">
                  <Loader2 className="h-3 w-3 animate-spin" /> updating
                </span>
              )}
            </div>

            <SeniorityMix jobs={data.results} />

            <div className="flex flex-col gap-3">
              {data.results.map((job, i) => {
                const isSaved = savedIds.has(String(job.id));
                return (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(i, 8) * 0.03 }}
                    whileHover={{ y: -3 }}
                  >
                    <Link to={`/app/jobs/${job.id}`}>
                      <Card className="flex flex-wrap items-center justify-between gap-3 transition-colors hover:border-forest/25 hover:shadow-[0_10px_28px_-16px_rgba(20,38,28,0.35)]">
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-display text-base font-bold text-forest">{job.title}</h3>
                          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-forest/55">
                            {job.company && <span>{job.company}</span>}
                            {job.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {job.location}
                              </span>
                            )}
                            {job.category && (
                              <span
                                className="rounded-full px-2 py-0.5 font-semibold text-forest"
                                style={{ backgroundColor: tagColor(job.category), opacity: 0.7 }}
                              >
                                {job.category}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {job.seniority && job.seniority !== "unspecified" && (
                            <Badge className="capitalize">{job.seniority}</Badge>
                          )}
                          <button
                            type="button"
                            onClick={(e) => toggleSave(e, job)}
                            disabled={saveBusyId === job.id}
                            aria-label={isSaved ? "Remove from saved jobs" : "Save job"}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-forest/50 transition-colors hover:bg-forest/8 hover:text-forest"
                          >
                            {isSaved ? <BookmarkCheck className="h-4 w-4 text-forest" /> : <Bookmark className="h-4 w-4" />}
                          </button>
                          <ArrowRight className="h-4 w-4 text-forest/40" />
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => goToPage(page - 1)}>
                <ArrowLeft className="h-3.5 w-3.5" /> Previous
              </Button>
              <span className="text-xs text-forest/50">
                Page {page + 1} of {Math.max(1, Math.ceil(data.total / PAGE_SIZE))}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={(page + 1) * PAGE_SIZE >= data.total}
                onClick={() => goToPage(page + 1)}
              >
                Next <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
