import { useEffect, useState } from "react";
import { Share2, Sparkles } from "lucide-react";
import { apiGet, apiPost } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import FeatureHeader from "./shared/FeatureHeader";
import Card from "./shared/Card";
import LoginPrompt from "./shared/LoginPrompt";
import SkillChips from "./shared/SkillChips";
import { EmptyState, ErrorState, LoadingState } from "./shared/RequestState";

// Wires up /auth/me/history, /auth/me/history/progress, and the
// share/revoke pair — all fully built on the backend, previously not
// called from anywhere in the frontend. `refreshKey` is state.data (the
// latest /recommend/evidence result), so a fresh run immediately shows up
// here without a separate poll.
function RoleHistory({ role, refreshKey }) {
  const [state, setState] = useState({ status: "idle", entries: [], progress: null });
  const [shareLinks, setShareLinks] = useState({});

  useEffect(() => {
    if (!role.trim()) {
      setState({ status: "idle", entries: [], progress: null });
      return undefined;
    }
    let cancelled = false;
    setState((s) => ({ ...s, status: "loading" }));
    Promise.all([
      apiGet("/auth/me/history", { params: { target_role: role, limit: 10 }, authed: true }),
      apiGet("/auth/me/history/progress", { params: { target_role: role }, authed: true }),
    ]).then(([historyRes, progressRes]) => {
      if (cancelled) return;
      setState({
        status: "ready",
        entries: historyRes.ok ? historyRes.data.results : [],
        progress: progressRes.ok ? progressRes.data : null,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [role, refreshKey]);

  const share = async (id) => {
    const { ok, data } = await apiPost(`/auth/me/history/${id}/share`, {}, { authed: true });
    if (ok) setShareLinks((prev) => ({ ...prev, [id]: `${window.location.origin}${data.share_path}` }));
  };

  if (state.status !== "ready" || state.entries.length === 0) return null;

  const { progress } = state;

  return (
    <Card eyebrow="History for this role" title={<span className="capitalize">{role}</span>} tone="cream" className="mt-8">
      {progress && !progress.message && (
        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="font-sans text-[11px] font-semibold uppercase tracking-wide text-forest/50">Skills closed</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {progress.skills_closed.length ? (
                progress.skills_closed.map((s) => (
                  <span key={s} className="rounded-full bg-lime/40 px-2 py-0.5 text-xs font-medium text-forest">
                    {s}
                  </span>
                ))
              ) : (
                <span className="text-xs text-charcoal/40">None yet</span>
              )}
            </div>
          </div>
          <div>
            <p className="font-sans text-[11px] font-semibold uppercase tracking-wide text-forest/50">Still open</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {progress.skills_still_open.map((s) => (
                <span key={s} className="rounded-full bg-periwinkle/40 px-2 py-0.5 text-xs text-charcoal/70">
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="font-sans text-[11px] font-semibold uppercase tracking-wide text-forest/50">New gaps</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {progress.new_gaps.length ? (
                progress.new_gaps.map((s) => (
                  <span key={s} className="rounded-full bg-danger/10 px-2 py-0.5 text-xs text-danger">
                    {s}
                  </span>
                ))
              ) : (
                <span className="text-xs text-charcoal/40">None</span>
              )}
            </div>
          </div>
        </div>
      )}
      {progress?.message && <p className="mb-5 font-sans text-xs text-charcoal/50">{progress.message}</p>}

      <ul className="flex flex-col gap-2">
        {state.entries.map((entry) => (
          <li key={entry.id} className="flex items-center justify-between rounded-xl border border-forest/10 bg-white px-4 py-2.5">
            <span className="font-sans text-xs text-charcoal/60">
              {new Date(entry.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} —{" "}
              {entry.recommendations.length} gap{entry.recommendations.length === 1 ? "" : "s"}
            </span>
            {shareLinks[entry.id] ? (
              <a href={shareLinks[entry.id]} target="_blank" rel="noreferrer" className="font-sans text-xs font-semibold text-forest underline">
                {shareLinks[entry.id].replace(/^https?:\/\//, "")}
              </a>
            ) : (
              <button
                type="button"
                onClick={() => share(entry.id)}
                className="flex items-center gap-1.5 font-sans text-xs font-semibold text-forest hover:opacity-70"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function Recommend() {
  const { isLoggedIn, profile } = useAuth();
  const [targetRole, setTargetRole] = useState("");
  const [skills, setSkills] = useState([]);
  const [seededFromProfile, setSeededFromProfile] = useState(false);
  const [state, setState] = useState({ status: "idle", data: null, error: null });
  const [committedRole, setCommittedRole] = useState("");

  // profile loads asynchronously (AuthContext fetches /auth/me after
  // mount), so this can't just be a lazy useState initializer — it needs
  // to catch profile.skills arriving on a later render, once, without
  // clobbering anything the user has already typed into the chip list.
  useEffect(() => {
    if (isLoggedIn && !seededFromProfile && profile?.skills?.length) {
      setSeededFromProfile(true);
      setSkills(profile.skills);
    }
  }, [isLoggedIn, seededFromProfile, profile]);

  const runRecommend = async (e) => {
    e.preventDefault();
    if (!targetRole.trim()) return;
    setState({ status: "loading", data: null, error: null });
    const { ok, data } = await apiPost(
      "/recommend/evidence",
      { target_role: targetRole, skills },
      { authed: true }
    );
    setState(ok ? { status: "ready", data, error: null } : { status: "error", data: null, error: data?.detail || "Couldn't get recommendations." });
    if (ok) setCommittedRole(targetRole);
  };

  return (
    <section className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
      <FeatureHeader
        eyebrow="Skill gaps, ranked"
        title="Recommend"
        subtitle="Tell us the role you're targeting and the skills you already have — we'll rank what's actually missing by real posting demand."
        illustration="/illustrations/recommend.png"
      />

      {!isLoggedIn ? (
        <div className="mt-10">
          <LoginPrompt feature="Recommend" />
        </div>
      ) : (
        <div className="mt-10">
          <Card tone="periwinkle">
            <form onSubmit={runRecommend} className="flex flex-col gap-5">
              <div>
                <label className="font-sans text-xs font-semibold uppercase tracking-wide text-forest/60">Target role</label>
                <input
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. backend developer"
                  className="mt-1.5 w-full max-w-sm rounded-xl border border-forest/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-forest/40"
                />
              </div>
              <div>
                <label className="font-sans text-xs font-semibold uppercase tracking-wide text-forest/60">Your skills</label>
                <div className="mt-1.5">
                  <SkillChips
                    skills={skills}
                    onAdd={(s) => setSkills((prev) => [...prev, s])}
                    onRemove={(s) => setSkills((prev) => prev.filter((x) => x !== s))}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={!targetRole.trim() || state.status === "loading"}
                className="flex w-fit items-center gap-2 rounded-full bg-forest px-6 py-2.5 font-sans text-sm font-semibold text-cream transition-transform hover:-translate-y-0.5 disabled:opacity-40"
              >
                <Sparkles className="h-4 w-4" />
                {state.status === "loading" ? "Finding gaps…" : "Get recommendations"}
              </button>
            </form>
          </Card>

          <div className="mt-8">
            {state.status === "loading" && <LoadingState label="Ranking skill gaps by real posting demand…" />}
            {state.status === "error" && <ErrorState message={state.error} />}
            {state.status === "ready" && (
              <div className="flex flex-col gap-4">
                {state.data.role_resolution?.matched_semantically && (
                  <p className="font-sans text-xs text-charcoal/50">
                    Matched "{targetRole}" to the closest tracked role: <strong>{state.data.role_resolution.resolved}</strong>.
                  </p>
                )}
                {state.data.recommendations.length === 0 ? (
                  <EmptyState message="No gaps found — either you're fully covered, or there isn't enough posting data for this role yet." />
                ) : (
                  state.data.recommendations.map((rec, index) => (
                    <div key={rec.skill} className="rounded-2xl border border-forest/10 bg-lime/10 p-5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-lime/40 font-display text-xs font-bold text-forest">
                            {index + 1}
                          </span>
                          <span className="font-display text-lg font-semibold text-charcoal">{rec.skill}</span>
                        </span>
                        <span className="font-sans text-xs text-charcoal/50">
                          {rec.postings_mentioning_it} posting{rec.postings_mentioning_it === 1 ? "" : "s"} mention it
                        </span>
                      </div>
                      {rec.evidence?.length > 0 && (
                        <div className="mt-3 flex flex-col gap-1.5 border-t border-forest/8 pt-3">
                          {rec.evidence.map((post, i) => (
                            <p key={i} className="font-sans text-xs text-charcoal/60">
                              <span className="font-medium text-charcoal/80">{post.title}</span> — {post.company ?? "Unknown"} · {post.location ?? "—"}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
                {state.data.tier === "free" && (
                  <p className="font-sans text-xs text-charcoal/40">
                    Free tier shows up to 3 postings of evidence per skill — pro accounts get 10.
                  </p>
                )}
              </div>
            )}
          </div>

          {committedRole && <RoleHistory role={committedRole} refreshKey={state.data} />}
        </div>
      )}
    </section>
  );
}
