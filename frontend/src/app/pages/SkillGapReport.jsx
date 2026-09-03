import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { X, Plus, ArrowRight, Gauge } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import * as api from "../../lib/api";
import { PageHeader, Card, Button, Badge, LoadingState, EmptyState } from "../ui";
import Autocomplete from "../Autocomplete";
import { TRACKED_ROLES } from "../../lib/roles";
import { colorFor } from "../../lib/skillCategories";

function SkillChip({ skill, onRemove }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-forest"
      style={{ backgroundColor: colorFor(skill), opacity: 0.9 }}
    >
      {skill}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${skill}`}
        className="text-forest/50 hover:text-forest"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

function DemandBar({ pct, skill }) {
  return (
    <div className="h-2 flex-1 rounded-full bg-forest/8">
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: colorFor(skill) }}
      />
    </div>
  );
}

export default function SkillGapReport() {
  const { user, refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState(searchParams.get("role") || "");
  const [skills, setSkills] = useState(user?.skills || []);
  const [skillInput, setSkillInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const addSkill = (value) => {
    const s = (value ?? skillInput).trim();
    if (s && !skills.some((existing) => existing.toLowerCase() === s.toLowerCase())) {
      setSkills([...skills, s]);
    }
    setSkillInput("");
  };

  const roleOptions = (query) =>
    TRACKED_ROLES.filter((r) => r.includes(query.trim().toLowerCase())).slice(0, 8);

  const skillOptions = (query) =>
    api
      .getSkills({ q: query, limit: 8 })
      .then((res) => res.results.map((s) => s.name).filter((n) => !skills.some((s) => s.toLowerCase() === n.toLowerCase())))
      .catch(() => []);

  const removeSkill = (s) => setSkills(skills.filter((existing) => existing !== s));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!role.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.recommendWithEvidence(role, skills);
      setResult(data);
      refreshUser();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        kicker="Analyze"
        title="Skill-Gap Report"
        description="Compare your skills against real job postings for a target role — every gap comes with the evidence behind it."
      />

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Autocomplete
            label="Target role"
            placeholder="e.g. Data Scientist"
            value={role}
            onChange={setRole}
            onSelect={setRole}
            getOptions={roleOptions}
          />

          <div>
            <span className="text-xs font-semibold text-forest/70">Your skills</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {skills.map((s) => (
                <SkillChip key={s} skill={s} onRemove={() => removeSkill(s)} />
              ))}
              {skills.length === 0 && <span className="text-sm text-forest/40">No skills added yet.</span>}
            </div>
            <div className="mt-3 flex gap-2">
              <Autocomplete
                className="flex-1"
                value={skillInput}
                onChange={setSkillInput}
                onSelect={(s) => addSkill(s)}
                onEnter={() => addSkill()}
                getOptions={skillOptions}
                minChars={1}
                placeholder="Add a skill and press Enter"
                inputClassName="h-10"
              />
              <Button type="button" variant="secondary" size="sm" onClick={() => addSkill()}>
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
          </div>

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}

          <Button type="submit" disabled={loading || !role.trim()} className="self-start">
            {loading ? "Analyzing postings…" : "Run Report"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>
      </Card>

      {loading && <LoadingState label="Comparing your skills against real postings…" />}

      {result && result.total_market_jobs === 0 && (
        <div className="mt-8">
          <EmptyState
            title="No postings found for that role"
            description={`We couldn't find any postings matching "${result.target_role}". Try a broader or more common title.`}
          />
        </div>
      )}

      {result && result.total_market_jobs > 0 && (
        <div className="mt-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold capitalize text-forest">
                {result.role_resolution?.resolved || result.target_role}
              </h2>
              <p className="text-xs text-forest/50">
                Analyzed {result.total_market_jobs.toLocaleString()} real postings
                {result.role_resolution?.matched_semantically && (
                  <> · matched semantically ({Math.round((result.role_resolution.similarity || 0) * 100)}% confidence)</>
                )}
              </p>
            </div>
            <Button as={Link} to={`/app/match?role=${encodeURIComponent(result.target_role)}`} variant="secondary" size="sm">
              <Gauge className="h-4 w-4" /> Check match score & salary
            </Button>
          </div>

          {result.recommendations.length === 0 ? (
            <EmptyState
              title="No gaps found"
              description="Your listed skills already cover the top market demands for this role."
            />
          ) : (
            <div className="flex flex-col gap-4">
              {result.recommendations.map((rec) => (
                <Card key={rec.skill}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-display text-base font-bold text-forest">{rec.skill}</h3>
                    <Badge style={{ backgroundColor: colorFor(rec.skill), opacity: 0.9 }}>
                      {rec.market_demand_pct}% of postings
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <DemandBar pct={rec.market_demand_pct} skill={rec.skill} />
                    <span className="w-32 shrink-0 text-xs text-forest/60">
                      {rec.postings_mentioning_it.toLocaleString()} postings
                    </span>
                  </div>

                  {rec.evidence?.length > 0 && (
                    <div className="mt-4 border-t border-forest/10 pt-4">
                      <span className="font-kicker text-[11px] uppercase tracking-widest text-forest/40">
                        Evidence
                      </span>
                      <ul className="mt-2 flex flex-col gap-2">
                        {rec.evidence.map((job, i) => (
                          <li key={i} className="text-sm text-forest/70">
                            <span className="font-semibold text-forest">{job.title}</span>
                            {job.company && <> · {job.company}</>} · {job.location}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          <p className="mt-6 text-center text-xs text-forest/45">
            This run was saved to your{" "}
            <Link to="/app/history" className="underline underline-offset-2">
              history
            </Link>
            , where you can share it as a public link.
          </p>
        </div>
      )}
    </div>
  );
}
