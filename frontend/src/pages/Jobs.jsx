import { useEffect, useState } from "react";
import { Bookmark, MapPin, Search, X } from "lucide-react";
import { apiDelete, apiGet, apiPost } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import FeatureHeader from "./shared/FeatureHeader";
import { EmptyState, ErrorState, LoadingState } from "./shared/RequestState";

const PAGE_SIZE = 12;
const SENIORITY_OPTIONS = [
  { value: "", label: "Any seniority" },
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "unspecified", label: "Unspecified" },
];

const SENIORITY_TONE = {
  junior: "bg-periwinkle/40 text-forest",
  mid: "bg-lime/40 text-forest",
  senior: "bg-forest text-cream",
  unspecified: "bg-forest/10 text-charcoal/60",
};

export default function Jobs() {
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [seniority, setSeniority] = useState("");
  const [offset, setOffset] = useState(0);
  const [state, setState] = useState({ status: "loading", data: null, error: null });
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState({ status: "idle", data: null });
  const [savedIds, setSavedIds] = useState(new Set());
  const [match, setMatch] = useState({ status: "idle", data: null });
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", data: null, error: null });
    apiGet("/jobs", { params: { role, location, seniority, limit: PAGE_SIZE, offset } }).then(({ ok, data }) => {
      if (cancelled) return;
      if (ok) setState({ status: "ready", data, error: null });
      else setState({ status: "error", data: null, error: data?.detail || "Couldn't load jobs." });
    });
    return () => {
      cancelled = true;
    };
  }, [role, location, seniority, offset]);

  useEffect(() => {
    if (selectedId == null) return;
    setDetail({ status: "loading", data: null });
    setMatch({ status: "idle", data: null });
    apiGet(`/jobs/${selectedId}`).then(({ ok, data }) => {
      setDetail(ok ? { status: "ready", data } : { status: "error", data: null });
    });
    if (isLoggedIn) {
      setMatch({ status: "loading", data: null });
      apiGet(`/jobs/${selectedId}/match`, { authed: true }).then(({ ok, data }) => {
        setMatch(ok ? { status: "ready", data } : { status: "error", data: null });
      });
    }
  }, [selectedId, isLoggedIn]);

  // Loaded once per login, not re-fetched per row — /auth/me/saved-jobs
  // returns every saved job at once, so a per-row fetch would just be
  // the same list requested N times over for N rows on the page.
  useEffect(() => {
    if (!isLoggedIn) {
      setSavedIds(new Set());
      return;
    }
    apiGet("/auth/me/saved-jobs", { params: { limit: 100 }, authed: true }).then(({ ok, data }) => {
      if (ok) setSavedIds(new Set(data.results.map((r) => r.job_id)));
    });
  }, [isLoggedIn]);

  const toggleSave = async (jobId) => {
    const isSaved = savedIds.has(jobId);
    setSavedIds((prev) => {
      const next = new Set(prev);
      isSaved ? next.delete(jobId) : next.add(jobId);
      return next;
    });
    if (isSaved) await apiDelete(`/jobs/${jobId}/save`);
    else await apiPost(`/jobs/${jobId}/save`, {}, { authed: true });
  };

  const results = state.data?.results ?? [];
  const total = state.data?.total ?? 0;

  return (
    <section className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      <FeatureHeader
        eyebrow="Live postings"
        title="Jobs"
        subtitle="Real listings pulled straight from the ingestion pipeline — filter by role, location, or seniority."
        illustration="/illustrations/jobs.svg"
      />

      <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="relative flex items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-charcoal/40" />
          <input
            value={role}
            onChange={(e) => {
              setOffset(0);
              setRole(e.target.value);
            }}
            placeholder="Role, e.g. backend developer"
            className="w-full rounded-xl border border-forest/15 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-forest/40"
          />
        </label>
        <label className="relative flex items-center">
          <MapPin className="pointer-events-none absolute left-3 h-4 w-4 text-charcoal/40" />
          <input
            value={location}
            onChange={(e) => {
              setOffset(0);
              setLocation(e.target.value);
            }}
            placeholder="Location, e.g. remote"
            className="w-full rounded-xl border border-forest/15 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-forest/40"
          />
        </label>
        <select
          value={seniority}
          onChange={(e) => {
            setOffset(0);
            setSeniority(e.target.value);
          }}
          className="rounded-xl border border-forest/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-forest/40"
        >
          {SENIORITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div>
          {state.status === "loading" && <LoadingState label="Searching postings…" />}
          {state.status === "error" && <ErrorState message={state.error} />}
          {state.status === "ready" && results.length === 0 && <EmptyState message="No postings match those filters." />}

          {state.status === "ready" && results.length > 0 && (
            <>
              <p className="mb-3 font-sans text-xs text-charcoal/40">
                {total.toLocaleString()} posting{total === 1 ? "" : "s"} — showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)}
              </p>
              <ul className="flex flex-col gap-2">
                {results.map((job) => (
                  <li
                    key={job.id}
                    className={`flex items-start gap-2 rounded-xl border px-4 py-3 transition-colors ${
                      selectedId === job.id ? "border-forest/40 bg-periwinkle/15" : "border-forest/10 bg-white hover:border-forest/25"
                    }`}
                  >
                    {/* A separate sibling button, not nested — a bookmark
                        <button> inside the row-select <button> would be
                        invalid HTML (buttons can't contain buttons), the
                        same class of bug the Recommend form hit earlier. */}
                    <button onClick={() => setSelectedId(job.id)} className="flex-1 text-left">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-display font-semibold text-charcoal">{job.title}</span>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${SENIORITY_TONE[job.seniority]}`}>
                          {job.seniority}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 font-sans text-xs text-charcoal/50">
                        <span>{job.company ?? "Unknown company"}</span>
                        <span>·</span>
                        <span>{job.location ?? "Location unspecified"}</span>
                        <span>·</span>
                        <span>{job.category}</span>
                      </div>
                    </button>
                    {isLoggedIn && (
                      <button
                        type="button"
                        onClick={() => toggleSave(job.id)}
                        aria-label={savedIds.has(job.id) ? "Remove bookmark" : "Save job"}
                        className="shrink-0 rounded-full p-1.5 hover:bg-forest/5"
                      >
                        <Bookmark className={`h-4 w-4 ${savedIds.has(job.id) ? "fill-forest text-forest" : "text-charcoal/25"}`} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex items-center justify-between font-sans text-sm">
                <button
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  className="font-semibold text-forest disabled:opacity-30"
                >
                  ← Previous
                </button>
                <button
                  disabled={offset + PAGE_SIZE >= total}
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                  className="font-semibold text-forest disabled:opacity-30"
                >
                  Next →
                </button>
              </div>
            </>
          )}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          {selectedId == null && (
            <div className="rounded-2xl border border-dashed border-forest/15 px-5 py-8 text-center text-sm text-charcoal/40">
              Select a posting to see its full description.
            </div>
          )}
          {selectedId != null && (
            <div className="rounded-2xl border border-forest/10 bg-periwinkle/15 p-6">
              <button
                onClick={() => setSelectedId(null)}
                className="float-right flex h-7 w-7 items-center justify-center rounded-full bg-white text-charcoal/50 hover:text-charcoal"
              >
                <X className="h-4 w-4" />
              </button>
              {detail.status === "loading" && <LoadingState label="Loading posting…" />}
              {detail.status === "error" && <ErrorState message="Couldn't load that posting." />}
              {detail.status === "ready" && detail.data && (
                <>
                  <h3 className="font-display text-lg font-semibold text-charcoal">{detail.data.title}</h3>
                  <p className="mt-1 font-sans text-sm text-charcoal/50">
                    {detail.data.company ?? "Unknown company"} · {detail.data.location ?? "Location unspecified"}
                  </p>

                  {isLoggedIn && match.status === "ready" && match.data.match_pct != null && (
                    <div className="mt-4 rounded-xl bg-white p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-sans text-[11px] font-semibold uppercase tracking-wide text-forest/50">Your match</span>
                        <span className="font-display text-lg font-bold text-forest">{match.data.match_pct}%</span>
                      </div>
                      {match.data.missing_skills.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {match.data.missing_skills.slice(0, 8).map((s) => (
                            <span key={s} className="rounded-full bg-danger/10 px-2 py-0.5 text-xs capitalize text-danger">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <p className="mt-4 whitespace-pre-line font-sans text-sm leading-relaxed text-charcoal/70">
                    {detail.data.description || "No description available for this posting."}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
