import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowRight, TrendingUp, DollarSign } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import * as api from "../../lib/api";
import { PageHeader, Card, Button, Input, Badge, LoadingState } from "../ui";

function ScoreRing({ pct }) {
  const value = pct ?? 0;
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(20,38,28,0.08)" strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="var(--periwinkle)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute font-display text-2xl font-bold text-forest">
        {pct != null ? `${pct}%` : "—"}
      </span>
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
  const [salaryUnavailable, setSalaryUnavailable] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!role.trim()) return;
    setLoading(true);
    setError(null);
    setMatch(null);
    setSalary(null);
    setSalaryUnavailable(false);

    const [matchRes, salaryRes] = await Promise.allSettled([
      api.getMatchScore(role, skills),
      api.predictSalary(role, skills),
    ]);

    if (matchRes.status === "fulfilled") setMatch(matchRes.value);
    else setError(matchRes.reason.message);

    if (salaryRes.status === "fulfilled") setSalary(salaryRes.value);
    else if (salaryRes.reason.status === 503) setSalaryUnavailable(true);

    setLoading(false);
  };

  return (
    <div>
      <PageHeader
        kicker="Analyze"
        title="Match Score & Salary"
        description="See what percentage of real postings your skills would be a strong match for, and a predicted salary range."
      />

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
          <div className="min-w-[240px] flex-1">
            <Input label="Target role" placeholder="e.g. Backend Developer" value={role} onChange={(e) => setRole(e.target.value)} required />
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
      {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}

      {(match || salary) && (
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {match && (
            <Card>
              <div className="flex items-center gap-2 text-forest/70">
                <TrendingUp className="h-4 w-4" />
                <span className="font-kicker text-xs uppercase tracking-widest">Match score</span>
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
                      <p className="mt-1 text-xs text-forest/50">
                        Avg. skill overlap: {match.avg_overlap_pct}% · threshold: {match.coverage_threshold_pct}%
                      </p>
                    </div>
                  </div>

                  {match.top_missing_skills?.length > 0 && (
                    <div className="mt-5 border-t border-forest/10 pt-4">
                      <span className="font-kicker text-[11px] uppercase tracking-widest text-forest/40">
                        Top missing skills
                      </span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {match.top_missing_skills.map((s) => (
                          <Badge key={s.skill} tone="periwinkle">
                            {s.skill} · {s.market_demand_pct}%
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </Card>
          )}

          <Card>
            <div className="flex items-center gap-2 text-forest/70">
              <DollarSign className="h-4 w-4" />
              <span className="font-kicker text-xs uppercase tracking-widest">Predicted salary</span>
            </div>

            {salaryUnavailable && (
              <p className="mt-4 text-sm text-forest/60">
                No salary model has been trained yet for this dataset — check back once one is available.
              </p>
            )}

            {salary && (
              <>
                <p className="mt-4 font-display text-2xl font-bold text-forest">
                  ${salary.predicted_salary_low.toLocaleString()} – ${salary.predicted_salary_high.toLocaleString()}
                </p>
                <p className="mt-1 text-sm text-forest/60">
                  Midpoint estimate: ${salary.predicted_salary_midpoint.toLocaleString()}
                </p>
                <p className="mt-3 text-xs text-forest/45">
                  Matched role bucket: <span className="capitalize">{salary.matched_role_bucket}</span> · confidence
                  interval width ${salary.confidence_interval_width.toLocaleString()}
                </p>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
