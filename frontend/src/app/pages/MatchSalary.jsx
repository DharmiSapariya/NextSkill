import SalaryTransparency from "./SalaryTransparency";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, TrendingUp, Plus, X, Scale, Target } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import * as api from "../../lib/api";
import { PageHeader, Card, Button, Badge, LoadingState, InfoHint } from "../ui";
import Autocomplete from "../Autocomplete";
import { TRACKED_ROLES } from "../../lib/roles";
import { colorFor } from "../../lib/skillCategories";

function ScoreRing({ pct }) {
  const value = pct ?? 0;
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(20,38,28,0.08)" strokeWidth="10" />
        <motion.circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke={value >= 60 ? "var(--lime)" : value >= 30 ? "var(--amber)" : "var(--coral)"}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <span className="absolute font-display text-2xl font-bold text-forest">
        {pct != null ? `${pct}%` : "—"}
      </span>
    </div>
  );
}

// Shows your average skill overlap against the coverage threshold a posting
// needs to clear to count as a "strong match" — both real numbers from the
// same response, just made visual instead of two separate sentences.
function ThresholdBar({ avgOverlap, threshold }) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-xs text-forest/55">
        <span>Your avg. overlap</span>
        <span className="font-semibold text-forest">{avgOverlap}%</span>
      </div>
      <div className="relative mt-1.5 h-2.5 overflow-visible rounded-full bg-forest/8">
        <motion.div
          className="h-full rounded-full bg-periwinkle"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, avgOverlap)}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
        <div
          className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 bg-forest/60"
          style={{ left: `${Math.min(100, threshold)}%` }}
          title={`Match threshold: ${threshold}%`}
        />
      </div>
      <p className="mt-1 text-[11px] text-forest/40">The dark tick marks the {threshold}% overlap needed to count as a match.</p>
    </div>
  );
}

function MissingSkillRow({ skill, pct }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colorFor(skill) }} />
      <span className="min-w-0 flex-1 truncate text-xs font-medium text-forest">{skill}</span>
      <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-forest/8">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: colorFor(skill) }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <span className="w-9 shrink-0 text-right text-[11px] text-forest/50">{pct}%</span>
    </div>
  );
}

function RoleResultPanel({ role, match, salary, salaryError, error }) {
  return (
    <div className="flex flex-col gap-6">
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      {match && (
        <Card>
          <div className="flex items-center gap-2 text-forest/70">
            <TrendingUp className="h-4 w-4" />
            <span className="font-kicker text-xs uppercase tracking-widest">Match score</span>
            <InfoHint text="The share of real postings for this role where your skills clear the overlap threshold — not a guess, a count." />
          </div>

          {match.match_pct == null ? (
            <p className="mt-4 text-sm text-forest/60">{match.message || "Not enough data to compute a match score for this role."}</p>
          ) : (
            <>
              <div className="mt-4 flex items-center gap-5">
                <ScoreRing pct={match.match_pct} />
                <div>
                  <p className="text-sm text-forest/70">
                    Strong match for <span className="font-bold text-forest">{match.match_pct}%</span> of{" "}
                    {match.parsed_jobs_analyzed.toLocaleString()} analyzed postings
                  </p>
                  <p className="mt-1 text-xs text-forest/45">
                    {match.parsed_jobs_analyzed.toLocaleString()} of {match.total_market_jobs.toLocaleString()} total postings for
                    this role had parseable skill data
                  </p>
                </div>
              </div>

              <ThresholdBar avgOverlap={match.avg_overlap_pct} threshold={match.coverage_threshold_pct} />

              {match.top_missing_skills?.length > 0 && (
                <div className="mt-5 border-t border-forest/10 pt-4">
                  <span className="font-kicker text-[11px] uppercase tracking-widest text-forest/40">
                    Top missing skills
                  </span>
                  <div className="mt-2.5 flex flex-col gap-2">
                    {match.top_missing_skills.map((s) => (
                      <MissingSkillRow key={s.skill} skill={s.skill} pct={s.market_demand_pct} />
                    ))}
                  </div>
                  <Button as={Link} to={`/app/report?role=${encodeURIComponent(role)}`} variant="secondary" size="sm" className="mt-4 w-full">
                    Close these gaps <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      )}

      <SalaryTransparency salary={salary} error={salaryError} />
    </div>
  );
}

export default function MatchSalary() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState(searchParams.get("role") || "");
  const [skills] = useState(user?.skills || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [match, setMatch] = useState(null);
  const [salary, setSalary] = useState(null);
  const [salaryError, setSalaryError] = useState(null);

  const [compareOpen, setCompareOpen] = useState(false);
  const [compareRole, setCompareRole] = useState("");
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState(null);
  const [compareMatch, setCompareMatch] = useState(null);
  const [compareSalary, setCompareSalary] = useState(null);
  const [compareSalaryError, setCompareSalaryError] = useState(null);

  const runFor = async (targetRole) => {
    const [matchRes, salaryRes] = await Promise.allSettled([
      api.getMatchScore(targetRole, skills),
      api.predictSalary(targetRole, skills),
    ]);
    return {
      match: matchRes.status === "fulfilled" ? matchRes.value : null,
      matchError: matchRes.status === "rejected" ? matchRes.reason.message : null,
      salary: salaryRes.status === "fulfilled" ? salaryRes.value : null,
      salaryError: salaryRes.status === "rejected"
        ? salaryRes.reason.status === 503
          ? "Salary estimate unavailable. A model may not be available for this dataset."
          : "Salary estimate could not be loaded. Try again."
        : null,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!role.trim()) return;
    setLoading(true);
    setError(null);
    setMatch(null);
    setSalary(null);
    setSalaryError(null);

    const result = await runFor(role);
    setMatch(result.match);
    setError(result.matchError);
    setSalary(result.salary);
    setSalaryError(result.salaryError);
    setLoading(false);
  };

  const handleCompareSubmit = async (e) => {
    e.preventDefault();
    if (!compareRole.trim()) return;
    setCompareLoading(true);
    setCompareError(null);
    setCompareMatch(null);
    setCompareSalary(null);
    setCompareSalaryError(null);

    const result = await runFor(compareRole);
    setCompareMatch(result.match);
    setCompareError(result.matchError);
    setCompareSalary(result.salary);
    setCompareSalaryError(result.salaryError);
    setCompareLoading(false);
  };

  const winner =
    match?.match_pct != null && compareMatch?.match_pct != null
      ? match.match_pct === compareMatch.match_pct
        ? "tie"
        : match.match_pct > compareMatch.match_pct
        ? "primary"
        : "compare"
      : null;

  return (
    <div>
      <PageHeader
        kicker="Analyze"
        title="Match Score & Salary"
        description="See what percentage of real postings your skills would be a strong match for, and review the salary model’s data and limitations."
      />

      <div className="mb-8 flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-2xl border border-forest/10 bg-lime/20 px-6 py-6 sm:px-8">
        <div>
          <span className="font-kicker text-xs uppercase tracking-widest text-forest/50">Analyze</span>
          <p className="mt-2 max-w-xl font-display text-xl font-bold text-forest sm:text-2xl">
            Compare any target role against your {skills.length} saved skill{skills.length === 1 ? "" : "s"} — score and salary evidence,
            side by side.
          </p>
        </div>
        <img src="/illustrations/20n.png" alt="" className="hidden h-28 w-28 shrink-0 object-contain sm:block" />
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
          <div className="min-w-0 flex-1 basis-52">
            <Autocomplete
              label="Target role"
              placeholder="e.g. Backend Developer"
              value={role}
              onChange={setRole}
              onSelect={setRole}
              getOptions={(q) => TRACKED_ROLES.filter((r) => r.includes(q.trim().toLowerCase())).slice(0, 8)}
            />
          </div>
          <Button type="submit" disabled={loading || !role.trim()}>
            {loading ? "Analyzing…" : "Check"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>
        <p className="mt-3 text-xs text-forest/45">
          Using your {skills.length} saved skill{skills.length === 1 ? "" : "s"}. Update them in{" "}
          <a href="/app/settings" className="underline underline-offset-2">
            Settings
          </a>
          .
        </p>
      </Card>

      {loading && <LoadingState label="Scoring your profile against the market…" />}

      {!loading && (match || salary || error || salaryError) && (
        <>
          <div className="mt-8">
            {!compareOpen ? (
              <button
                type="button"
                onClick={() => setCompareOpen(true)}
                className="flex items-center gap-1.5 text-sm font-semibold text-forest/60 hover:text-forest"
              >
                <Scale className="h-4 w-4" /> Compare with another role
              </button>
            ) : (
              <Card>
                <form onSubmit={handleCompareSubmit} className="flex flex-wrap items-end gap-4">
                  <div className="min-w-[220px] flex-1">
                    <Autocomplete
                      label="Compare against"
                      placeholder="e.g. Data Scientist"
                      value={compareRole}
                      onChange={setCompareRole}
                      onSelect={setCompareRole}
                      getOptions={(q) => TRACKED_ROLES.filter((r) => r.includes(q.trim().toLowerCase())).slice(0, 8)}
                    />
                  </div>
                  <Button type="submit" variant="secondary" disabled={compareLoading || !compareRole.trim()}>
                    {compareLoading ? "Comparing…" : "Compare"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setCompareOpen(false);
                      setCompareRole("");
                      setCompareMatch(null);
                      setCompareSalary(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </form>
              </Card>
            )}
          </div>

          {compareLoading && <LoadingState label="Scoring the second role…" />}

          {(compareMatch || compareSalary || compareError || compareSalaryError) && !compareLoading ? (
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4 text-forest/50" />
                  <h3 className="font-display text-sm font-bold capitalize text-forest">{role}</h3>
                  {winner === "primary" && <Badge tone="lime">Higher match</Badge>}
                </div>
                <RoleResultPanel role={role} match={match} salary={salary} salaryError={salaryError} error={error} />
              </div>
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4 text-forest/50" />
                  <h3 className="font-display text-sm font-bold capitalize text-forest">{compareRole}</h3>
                  {winner === "compare" && <Badge tone="lime">Higher match</Badge>}
                </div>
                <RoleResultPanel
                  role={compareRole}
                  match={compareMatch}
                  salary={compareSalary}
                  salaryError={compareSalaryError}
                  error={compareError}
                />
              </div>
            </div>
          ) : (
            !compareLoading && (
              <div className="mt-8">
                <RoleResultPanel role={role} match={match} salary={salary} salaryError={salaryError} error={error} />
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
