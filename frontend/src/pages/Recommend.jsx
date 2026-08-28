import { useEffect, useState } from "react";
import { Plus, Sparkles, X } from "lucide-react";
import { apiPost } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import FeatureHeader from "./shared/FeatureHeader";
import Card from "./shared/Card";
import LoginPrompt from "./shared/LoginPrompt";
import { EmptyState, ErrorState, LoadingState } from "./shared/RequestState";

function SkillChips({ skills, onRemove, onAdd }) {
  const [draft, setDraft] = useState("");

  // Deliberately not a nested <form> — this whole component renders inside
  // Recommend's own outer <form>, and HTML doesn't allow forms inside
  // forms; the browser silently restructures the DOM around it, which
  // broke both submit buttons in practice (caught via Playwright: the
  // outer submit button stayed permanently disabled after using this).
  const submit = () => {
    const value = draft.trim();
    if (value && !skills.includes(value)) onAdd(value);
    setDraft("");
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <span key={skill} className="flex items-center gap-1.5 rounded-full bg-periwinkle/30 px-3 py-1 text-sm text-charcoal">
            {skill}
            <button type="button" onClick={() => onRemove(skill)} aria-label={`Remove ${skill}`}>
              <X className="h-3.5 w-3.5 text-charcoal/50 hover:text-charcoal" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Add a skill you have"
          className="w-full max-w-xs rounded-xl border border-forest/15 bg-white px-3 py-2 text-sm outline-none focus:border-forest/40"
        />
        <button
          type="button"
          onClick={submit}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-forest/15 text-forest hover:bg-forest/5"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function Recommend() {
  const { isLoggedIn, profile } = useAuth();
  const [targetRole, setTargetRole] = useState("");
  const [skills, setSkills] = useState([]);
  const [seededFromProfile, setSeededFromProfile] = useState(false);
  const [state, setState] = useState({ status: "idle", data: null, error: null });

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
  };

  return (
    <section className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
      <FeatureHeader
        eyebrow="Skill gaps, ranked"
        title="Recommend"
        subtitle="Tell us the role you're targeting and the skills you already have — we'll rank what's actually missing by real posting demand."
        illustration="/illustrations/recommend.svg"
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
        </div>
      )}
    </section>
  );
}
