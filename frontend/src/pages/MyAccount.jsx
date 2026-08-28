import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Bookmark, KeyRound, Share2, Trash2 } from "lucide-react";
import { apiDelete, apiGet, apiPost, apiPut } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import FeatureHeader from "./shared/FeatureHeader";
import Card from "./shared/Card";
import SkillChips from "./shared/SkillChips";
import { EmptyState, ErrorState, LoadingState } from "./shared/RequestState";

function ProfileCard({ profile }) {
  return (
    <Card eyebrow="Signed in as" title={profile.email} tone="periwinkle">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold capitalize text-forest">{profile.tier} tier</span>
        {profile.is_admin && <span className="rounded-full bg-forest px-3 py-1 text-xs font-semibold text-cream">Admin</span>}
      </div>
    </Card>
  );
}

function SkillsCard({ profile, refreshProfile }) {
  const [skills, setSkills] = useState(profile.skills || []);
  const [status, setStatus] = useState("idle");

  const save = async () => {
    setStatus("saving");
    const { ok } = await apiPut("/auth/me/skills", { skills });
    setStatus(ok ? "saved" : "error");
    if (ok) refreshProfile();
    if (ok) setTimeout(() => setStatus("idle"), 1500);
  };

  return (
    <Card eyebrow="Saved skill profile" title="Your skills" tone="lime">
      <p className="mb-3 font-sans text-xs text-charcoal/50">
        This is what Recommend, Resume &amp; Salary, and match scores use by default.
      </p>
      <SkillChips skills={skills} onAdd={(s) => setSkills((prev) => [...prev, s])} onRemove={(s) => setSkills((prev) => prev.filter((x) => x !== s))} />
      <button
        onClick={save}
        disabled={status === "saving"}
        className="mt-4 rounded-full bg-forest px-5 py-2 font-sans text-sm font-semibold text-cream disabled:opacity-40"
      >
        {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : "Save skills"}
      </button>
    </Card>
  );
}

function DigestCard() {
  const [state, setState] = useState({ status: "loading", data: null });

  useEffect(() => {
    apiGet("/auth/me/digest", { authed: true }).then(({ ok, data }) => {
      setState(ok ? { status: "ready", data } : { status: "error", data: null });
    });
  }, []);

  return (
    <Card eyebrow="What's changed since you last looked" title="Digest" tone="cream">
      {state.status === "loading" && <LoadingState label="Comparing your recent runs…" />}
      {state.status === "error" && <ErrorState message="Couldn't load your digest." />}
      {state.status === "ready" && state.data.changes.length === 0 && (
        <EmptyState message={state.data.message || "No change since your last recorded run."} />
      )}
      {state.status === "ready" && state.data.changes.length > 0 && (
        <ul className="flex flex-col gap-2">
          {state.data.changes.map((c) => (
            <li key={c.resolved_role} className="rounded-xl border border-forest/10 bg-white px-4 py-3 text-sm">
              <span className="font-semibold capitalize text-charcoal">{c.resolved_role}</span>
              <p className="mt-1 font-sans text-xs text-charcoal/60">
                Top gap moved from <strong>{c.previous_top_gap_skill}</strong> to <strong>{c.current_top_gap_skill}</strong>
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function SharedReportsCard() {
  const [state, setState] = useState({ status: "loading", data: null });

  const load = () => {
    apiGet("/auth/me/shared-reports", { authed: true }).then(({ ok, data }) => {
      setState(ok ? { status: "ready", data } : { status: "error", data: null });
    });
  };

  useEffect(load, []);

  const revoke = async (token) => {
    await apiDelete(`/auth/me/history/shared/${token}`);
    load();
  };

  return (
    <Card eyebrow="Public links you've published" title="Shared reports" tone="periwinkle">
      {state.status === "loading" && <LoadingState label="Loading your shared links…" />}
      {state.status === "error" && <ErrorState message="Couldn't load shared reports." />}
      {state.status === "ready" && state.data.results.length === 0 && (
        <EmptyState message="Nothing shared yet — publish a link from a recommendation on the Recommend page." />
      )}
      {state.status === "ready" && state.data.results.length > 0 && (
        <ul className="flex flex-col gap-2">
          {state.data.results.map((r) => (
            <li key={r.token} className="flex items-center justify-between rounded-xl border border-forest/10 bg-white px-4 py-2.5">
              <div>
                <a href={r.share_path} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-semibold text-forest">
                  <Share2 className="h-3.5 w-3.5" />
                  <span className="capitalize">{r.target_role}</span>
                </a>
                <p className="mt-0.5 font-sans text-xs text-charcoal/40">
                  Shared {new Date(r.shared_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <button onClick={() => revoke(r.token)} className="font-sans text-xs font-semibold text-danger hover:opacity-70">
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function SavedJobsCard() {
  const [state, setState] = useState({ status: "loading", data: null });

  const load = () => {
    apiGet("/auth/me/saved-jobs", { authed: true }).then(({ ok, data }) => {
      setState(ok ? { status: "ready", data } : { status: "error", data: null });
    });
  };

  useEffect(load, []);

  const unsave = async (jobId) => {
    await apiDelete(`/jobs/${jobId}/save`);
    load();
  };

  return (
    <Card eyebrow="Bookmarked postings" title="Saved jobs" tone="lime">
      {state.status === "loading" && <LoadingState label="Loading saved jobs…" />}
      {state.status === "error" && <ErrorState message="Couldn't load saved jobs." />}
      {state.status === "ready" && state.data.results.length === 0 && (
        <EmptyState message="Nothing saved yet — bookmark a listing from the Jobs page." />
      )}
      {state.status === "ready" && state.data.results.length > 0 && (
        <ul className="flex flex-col gap-2">
          {state.data.results.map((job) => (
            <li key={job.job_id} className="flex items-center justify-between rounded-xl border border-forest/10 bg-white px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Bookmark className="h-3.5 w-3.5 text-forest" />
                <div>
                  <p className="text-sm font-medium text-charcoal">{job.title}</p>
                  <p className="font-sans text-xs text-charcoal/40">
                    {job.company ?? "Unknown"} · {job.location ?? "—"}
                  </p>
                </div>
              </div>
              <button onClick={() => unsave(job.job_id)} className="font-sans text-xs font-semibold text-danger hover:opacity-70">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function PasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState({ state: "idle", message: "" });

  const submit = async (e) => {
    e.preventDefault();
    setStatus({ state: "saving", message: "" });
    const { ok, data } = await apiPut("/auth/me/password", { current_password: currentPassword, new_password: newPassword });
    if (ok) {
      setStatus({ state: "saved", message: "Password updated." });
      setCurrentPassword("");
      setNewPassword("");
    } else {
      setStatus({ state: "error", message: data?.detail || "Couldn't update password." });
    }
  };

  return (
    <Card eyebrow="Security" title="Change password" tone="cream">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          type="password"
          required
          placeholder="Current password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full max-w-sm rounded-xl border border-forest/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-forest/40"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full max-w-sm rounded-xl border border-forest/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-forest/40"
        />
        <button
          type="submit"
          disabled={status.state === "saving"}
          className="flex w-fit items-center gap-2 rounded-full bg-forest px-5 py-2 font-sans text-sm font-semibold text-cream disabled:opacity-40"
        >
          <KeyRound className="h-4 w-4" />
          {status.state === "saving" ? "Updating…" : "Update password"}
        </button>
        {status.message && (
          <p className={`font-sans text-xs ${status.state === "error" ? "text-danger" : "text-forest"}`}>{status.message}</p>
        )}
      </form>
    </Card>
  );
}

function DangerZoneCard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    const { ok, data } = await apiDelete("/auth/me", { json: { password } });
    if (ok) {
      logout();
      navigate("/");
    } else {
      setError(data?.detail || "Couldn't delete account.");
    }
  };

  return (
    <Card eyebrow="Irreversible" title="Delete account" tone="white">
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="flex items-center gap-2 font-sans text-sm font-semibold text-danger hover:opacity-70"
        >
          <Trash2 className="h-4 w-4" />
          Delete my account
        </button>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <p className="font-sans text-xs text-charcoal/60">
            This permanently deletes your account, saved skills, recommendation history, and shared links. Confirm with your password.
          </p>
          <input
            type="password"
            required
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full max-w-sm rounded-xl border border-danger/30 bg-white px-3 py-2.5 text-sm outline-none focus:border-danger"
          />
          {error && <ErrorState message={error} />}
          <div className="flex gap-3">
            <button type="submit" className="rounded-full bg-danger px-5 py-2 font-sans text-sm font-semibold text-white">
              Permanently delete
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="font-sans text-sm text-charcoal/50">
              Cancel
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}

// GET/PUT /auth/me, /auth/me/skills, /auth/me/password, /auth/me/history,
// /auth/me/history/progress, /auth/me/digest, /auth/me/shared-reports,
// /auth/me/saved-jobs, DELETE /auth/me — every one of these existed on the
// backend already; this page is what wires all of them up for the first
// time. Recommend's history/progress/share stays on the Recommend page
// (role-scoped, next to the action that creates it); this page is the
// cross-role account surface: profile, skills, digest, what you've
// published, what you've bookmarked, security, and account deletion.
export default function MyAccount() {
  const { profile, loading, refreshProfile } = useAuth();

  if (loading || !profile) {
    return (
      <section className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
        <LoadingState label="Loading your account…" />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
      <FeatureHeader eyebrow="Your account" title="My Account" subtitle="Everything tied to your profile in one place." />

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <ProfileCard profile={profile} />
        <SkillsCard profile={profile} refreshProfile={refreshProfile} />
        <DigestCard />
        <SavedJobsCard />
        <SharedReportsCard />
        <PasswordCard />
      </div>

      <div className="mt-6 flex items-center gap-2 font-sans text-xs text-charcoal/40">
        <Bell className="h-3.5 w-3.5" />
        Digest is computed on demand here — no email delivery is wired up yet.
      </div>

      <div className="mt-10">
        <DangerZoneCard />
      </div>
    </section>
  );
}
