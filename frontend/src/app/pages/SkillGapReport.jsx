import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { X, Plus, ArrowRight, Gauge, Trophy, Share2, Copy, Check, ChevronDown, TrendingUp, Layers, Target } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import * as api from "../../lib/api";
import { PageHeader, Card, Button, Badge, LoadingState, EmptyState, InfoHint } from "../ui";
import Autocomplete from "../Autocomplete";
import { TRACKED_ROLES } from "../../lib/roles";
import { colorFor } from "../../lib/skillCategories";
import { useToast } from "../../context/ToastContext";

const EVIDENCE_LIMITS = { free: 3, pro: 10 };
const RANK_ACCENTS = ["var(--lime)", "var(--periwinkle)", "var(--coral)"];

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
    <div className="h-2 flex-1 overflow-hidden rounded-full bg-forest/8">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: colorFor(skill) }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(pct, 100)}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
}

function RankBadge({ rank }) {
  return (
    <span
      className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold text-forest"
      style={{ backgroundColor: RANK_ACCENTS[rank - 1] || "rgba(20,38,28,0.08)" }}
    >
      {rank === 1 && (
        <Trophy className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 rounded-full bg-cream p-0.5 text-forest shadow-sm" />
      )}
      {rank}
    </span>
  );
}

function ShareControl({ historyId }) {
  const toast = useToast();
  const [link, setLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    setLoading(true);
    try {
      const { share_path } = await api.shareHistoryEntry(historyId);
      setLink(`${window.location.origin}${share_path}`);
      toast.success("Report shared — link ready to copy");
    } catch {
      toast.error("Couldn't share this report — try again");
    } finally {
      setLoading(false);
    }
  };

  if (!historyId) return null;

  if (link) {
    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          navigator.clipboard?.writeText(link);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy share link"}
      </Button>
    );
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleShare} disabled={loading}>
      <Share2 className="h-3.5 w-3.5" /> {loading ? "Sharing…" : "Share this report"}
    </Button>
  );
}

function EvidenceList({ evidence }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? evidence : evidence.slice(0, 4);
  return (
    <div className="mt-4 border-t border-forest/10 pt-4">
      <span className="font-kicker text-[11px] uppercase tracking-widest text-forest/40">Evidence</span>
      <ul className="mt-2 flex flex-col gap-2">
        {visible.map((job, i) => (
          <li key={i} className="text-sm text-forest/70">
            <span className="font-semibold text-forest">{job.title}</span>
            {job.company && <> · {job.company}</>} · {job.location}
          </li>
        ))}
      </ul>
      {evidence.length > 4 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 flex items-center gap-1 text-xs font-semibold text-forest/50 hover:text-forest"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
          {expanded ? "Show fewer" : `+${evidence.length - 4} more`}
        </button>
      )}
    </div>
  );
}

export default function SkillGapReport() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState(searchParams.get("role") || "");
  const [skills, setSkills] = useState(user?.skills || []);
  const [skillInput, setSkillInput] = useState("");
  const [result, setResult] = useState(null);
  const [historyId, setHistoryId] = useState(null);
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
    setHistoryId(null);
    try {
      const data = await api.recommendWithEvidence(role, skills);
      setResult(data);
      refreshUser();
      toast.success(
        data.recommendations.length > 0
          ? `Found ${data.recommendations.length} gap skill${data.recommendations.length === 1 ? "" : "s"} — saved to your history`
          : "No gaps found — saved to your history"
      );
      // The run above was just recorded server-side, so the newest history
      // entry is this one — grab its id so "Share this report" works
      // without leaving the page.
      api
        .getHistory({ limit: 1 })
        .then((res) => setHistoryId(res.results[0]?.id ?? null))
        .catch(() => {});
    } catch (err) {
      setError(err.message);
      toast.error(err.message || "Couldn't run that report");
    } finally {
      setLoading(false);
    }
  };

  const sortedRecs = result ? [...result.recommendations].sort((a, b) => b.market_demand_pct - a.market_demand_pct) : [];
  const avgDemand =
    sortedRecs.length > 0 ? Math.round(sortedRecs.reduce((sum, r) => sum + r.market_demand_pct, 0) / sortedRecs.length) : 0;
  const evidenceLimit = result?.tier === "pro" ? EVIDENCE_LIMITS.pro : EVIDENCE_LIMITS.free;

  return (
    <div>
      <PageHeader
        kicker="Analyze"
        title="Skill-Gap Report"
        description="Compare your skills against real job postings for a target role — every gap comes with the evidence behind it."
      />

      <div className="mb-8 flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-2xl border border-forest/10 bg-periwinkle/35 px-6 py-6 sm:px-8">
        <div>
          <span className="font-kicker text-xs uppercase tracking-widest text-forest/50">Evidence-backed</span>
          <p className="mt-2 max-w-xl font-display text-xl font-bold text-forest sm:text-2xl">
            Every gap skill below is backed by real postings — no black-box score, just the evidence.
          </p>
        </div>
        <img src="/illustrations/2N.png" alt="" className="hidden h-28 w-28 shrink-0 object-contain sm:block" />
      </div>

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
            <div className="flex flex-wrap items-center gap-2">
              <ShareControl historyId={historyId} />
              <Button as={Link} to={`/app/match?role=${encodeURIComponent(result.target_role)}`} variant="secondary" size="sm">
                <Gauge className="h-4 w-4" /> Check match score & salary
              </Button>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="p-3 text-center">
              <p className="font-display text-xl font-bold text-forest">{result.total_market_jobs.toLocaleString()}</p>
              <p className="mt-0.5 text-[11px] uppercase tracking-wide text-forest/45">Postings analyzed</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="flex items-center justify-center gap-1 font-display text-xl font-bold text-forest">
                <Layers className="h-4 w-4 text-forest/40" /> {skills.length}
              </p>
              <p className="mt-0.5 text-[11px] uppercase tracking-wide text-forest/45">Skills you have</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="flex items-center justify-center gap-1 font-display text-xl font-bold text-forest">
                <Target className="h-4 w-4 text-forest/40" /> {sortedRecs.length}
              </p>
              <p className="mt-0.5 text-[11px] uppercase tracking-wide text-forest/45">Gaps found</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="flex items-center justify-center gap-1 font-display text-xl font-bold text-forest">
                <TrendingUp className="h-4 w-4 text-forest/40" /> {avgDemand}%
              </p>
              <p className="mt-0.5 text-[11px] uppercase tracking-wide text-forest/45">Avg. gap demand</p>
            </Card>
          </div>

          {sortedRecs.length === 0 ? (
            <EmptyState
              title="No gaps found"
              description="Your listed skills already cover the top market demands for this role."
            />
          ) : (
            <div className="flex flex-col gap-4">
              {sortedRecs.map((rec, i) => (
                <motion.div
                  key={rec.skill}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(i, 8) * 0.04 }}
                >
                  <Card>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        {i < 3 && <RankBadge rank={i + 1} />}
                        <h3 className="font-display text-base font-bold text-forest">{rec.skill}</h3>
                      </div>
                      <span className="flex items-center gap-1.5">
                        <Badge style={{ backgroundColor: colorFor(rec.skill), opacity: 0.9 }}>
                          {rec.market_demand_pct}% of postings
                        </Badge>
                        <InfoHint text={`Mentioned in ${rec.market_demand_pct}% of real postings analyzed for this role — one of the top gaps between your skills and the market.`} />
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <DemandBar pct={rec.market_demand_pct} skill={rec.skill} />
                      <span className="w-32 shrink-0 text-xs text-forest/60">
                        {rec.postings_mentioning_it.toLocaleString()} postings
                      </span>
                    </div>

                    {rec.evidence?.length > 0 && <EvidenceList evidence={rec.evidence} />}
                  </Card>
                </motion.div>
              ))}

              <p className="text-center text-[11px] text-forest/40">
                Showing up to {evidenceLimit} evidence postings per skill on your {result.tier === "pro" ? "Pro" : "Free"} plan
                {result.tier !== "pro" && " — Pro accounts see up to 10"}.
              </p>
            </div>
          )}

          <p className="mt-6 text-center text-xs text-forest/45">
            This run was saved to your{" "}
            <Link to="/app/history" className="underline underline-offset-2">
              history
            </Link>
            , where you can share it as a public link anytime.
          </p>
        </div>
      )}
    </div>
  );
}
