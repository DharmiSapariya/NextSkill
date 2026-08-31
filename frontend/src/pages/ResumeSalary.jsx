import { useRef, useState } from "react";
import { FileUp, TrendingUp } from "lucide-react";
import { apiPost, getApiBase, getToken } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import FeatureHeader from "./shared/FeatureHeader";
import Card from "./shared/Card";
import LoginPrompt from "./shared/LoginPrompt";
import { ErrorState, LoadingState } from "./shared/RequestState";

function ResumeUpload({ onParsed }) {
  const { refreshProfile } = useAuth();
  const inputRef = useRef(null);
  const [state, setState] = useState({ status: "idle", data: null, error: null });

  const upload = async (file) => {
    setState({ status: "loading", data: null, error: null });
    const form = new FormData();
    form.append("file", file);
    try {
      const response = await fetch(new URL("/auth/me/resume", getApiBase()), {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setState({ status: "error", data: null, error: data?.detail || "Couldn't parse that resume." });
        return;
      }
      setState({ status: "ready", data, error: null });
      onParsed?.(data.skills);
      refreshProfile();
    } catch {
      setState({ status: "error", data: null, error: "Upload failed — check your connection and try again." });
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx"
        className="hidden"
        onChange={(e) => e.target.files[0] && upload(e.target.files[0])}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={state.status === "loading"}
        className="flex items-center gap-2 rounded-full bg-forest px-6 py-2.5 font-sans text-sm font-semibold text-cream transition-transform hover:-translate-y-0.5 disabled:opacity-40"
      >
        <FileUp className="h-4 w-4" />
        {state.status === "loading" ? "Reading resume…" : "Upload resume (PDF or DOCX)"}
      </button>

      {state.status === "error" && <div className="mt-3"><ErrorState message={state.error} /></div>}
      {state.status === "ready" && (
        <div className="mt-4">
          <p className="font-sans text-sm text-charcoal/70">
            Found {state.data.skills_found_in_resume.length} skill{state.data.skills_found_in_resume.length === 1 ? "" : "s"} and merged into your profile:
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {state.data.skills_found_in_resume.map((s) => (
              <span key={s} className="rounded-full bg-lime/40 px-2.5 py-0.5 text-xs font-medium text-forest">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MatchAndSalary({ role, skills }) {
  const [state, setState] = useState({ status: "idle", match: null, salary: null, error: null });

  const run = async (e) => {
    e.preventDefault();
    if (!role.value.trim()) return;
    setState({ status: "loading", match: null, salary: null, error: null });
    const body = { target_role: role.value, skills };
    const [matchRes, salaryRes] = await Promise.all([
      apiPost("/match-score", body, { authed: true }),
      apiPost("/predict-salary", body, { authed: true }),
    ]);
    if (!matchRes.ok) {
      setState({ status: "error", match: null, salary: null, error: matchRes.data?.detail || "Couldn't compute a match score." });
      return;
    }
    setState({
      status: "ready",
      match: matchRes.data,
      salary: salaryRes.ok ? salaryRes.data : null,
      error: salaryRes.ok ? null : salaryRes.data?.detail,
    });
  };

  return (
    <form onSubmit={run} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="font-sans text-xs font-semibold uppercase tracking-wide text-forest/60">Target role</label>
        <input
          defaultValue={role.value}
          onChange={(e) => role.setValue(e.target.value)}
          placeholder="e.g. data scientist"
          className="mt-1.5 block w-64 rounded-xl border border-forest/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-forest/40"
        />
      </div>
      <button
        type="submit"
        disabled={!role.value.trim() || state.status === "loading"}
        className="flex items-center gap-2 rounded-full bg-forest px-6 py-2.5 font-sans text-sm font-semibold text-cream transition-transform hover:-translate-y-0.5 disabled:opacity-40"
      >
        <TrendingUp className="h-4 w-4" />
        Estimate
      </button>

      {state.status === "loading" && (
        <div className="w-full">
          <LoadingState label="Scoring your match and estimating salary…" />
        </div>
      )}
      {state.status === "error" && (
        <div className="w-full">
          <ErrorState message={state.error} />
        </div>
      )}
      {state.status === "ready" && (
        <div className="mt-2 grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-forest/10 bg-white p-5">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-wide text-forest/50">Match score</p>
            {state.match.match_pct == null ? (
              <p className="mt-2 font-sans text-sm text-charcoal/60">{state.match.message}</p>
            ) : (
              <>
                <p className="mt-1 font-display text-3xl font-bold text-charcoal">{state.match.match_pct}%</p>
                <p className="mt-1 font-sans text-xs text-charcoal/50">
                  of {state.match.sample_size} real postings — avg skill overlap {state.match.avg_overlap_pct}%
                </p>
              </>
            )}
          </div>
          <div className="rounded-2xl border border-forest/10 bg-white p-5">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-wide text-forest/50">Estimated salary</p>
            {state.salary ? (
              <>
                <p className="mt-1 font-display text-3xl font-bold text-charcoal">
                  ${state.salary.predicted_salary_low.toLocaleString()}–${state.salary.predicted_salary_high.toLocaleString()}
                </p>
                <p className="mt-1 font-sans text-xs text-charcoal/50">midpoint ${state.salary.predicted_salary_midpoint.toLocaleString()}</p>
              </>
            ) : (
              <p className="mt-2 font-sans text-sm text-charcoal/60">{state.error || "No salary model available yet."}</p>
            )}
          </div>
        </div>
      )}
    </form>
  );
}

export default function ResumeSalary() {
  const { isLoggedIn, profile } = useAuth();
  const [skills, setSkills] = useState([]);
  const [targetRole, setTargetRole] = useState("");

  return (
    <section className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
      <FeatureHeader
        eyebrow="Know what you're worth"
        title="Resume & Salary"
        subtitle="Upload a resume to auto-populate your skills, then get a market-aware salary estimate for any target role."
        illustration="/illustrations/resume-salary.png"
      />

      {!isLoggedIn ? (
        <div className="mt-10">
          <LoginPrompt feature="Resume & Salary" />
        </div>
      ) : (
        <div className="mt-10 flex flex-col gap-6">
          <Card eyebrow="Step 1" title="Upload your resume" tone="periwinkle">
            <ResumeUpload onParsed={(found) => setSkills((prev) => Array.from(new Set([...prev, ...found])))} />
          </Card>
          <Card eyebrow="Step 2" title="Get your estimate" tone="lime">
            <MatchAndSalary
              role={{ value: targetRole, setValue: setTargetRole }}
              skills={skills.length ? skills : profile?.skills || []}
            />
          </Card>
        </div>
      )}
    </section>
  );
}
