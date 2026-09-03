import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, MapPin, Copy, Check, Printer, Trophy, ChevronDown, Target, TrendingUp } from "lucide-react";
import * as api from "../../lib/api";
import { LoadingState, ErrorState, Card, Button, InfoHint } from "../ui";
import { colorFor } from "../../lib/skillCategories";

const RANK_ACCENTS = ["var(--lime)", "var(--periwinkle)", "var(--coral)"];

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

function DemandBar({ pct, color }) {
  return (
    <div className="h-2 flex-1 overflow-hidden rounded-full bg-forest/8">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(pct, 100)}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
}

function RecommendationCard({ rec, rank }) {
  const [expanded, setExpanded] = useState(false);
  const evidence = rec.evidence || [];
  const visibleEvidence = expanded ? evidence : evidence.slice(0, 4);
  const color = colorFor(rec.skill);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: rank * 0.05 }}>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {rank <= 3 && <RankBadge rank={rank} />}
            <h3 className="font-display text-base font-bold text-forest">{rec.skill}</h3>
          </div>
          {rec.market_demand_pct != null && (
            <span
              className="rounded-full px-2.5 py-1 text-xs font-bold text-forest"
              style={{ backgroundColor: color, opacity: 0.85 }}
            >
              {rec.market_demand_pct}% of postings
            </span>
          )}
        </div>
        {rec.market_demand_pct != null && (
          <div className="mt-3 flex items-center gap-3">
            <DemandBar pct={rec.market_demand_pct} color={color} />
            <span className="w-28 shrink-0 text-right text-xs text-forest/60">
              {rec.postings_mentioning_it?.toLocaleString()} postings
            </span>
          </div>
        )}
        {evidence.length > 0 && (
          <div className="mt-4 border-t border-forest/10 pt-4">
            <span className="font-kicker text-[11px] uppercase tracking-widest text-forest/40">Evidence</span>
            <ul className="mt-2 flex flex-col gap-2">
              {visibleEvidence.map((job, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-forest/70">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-forest/25" />
                  <span>
                    <span className="font-semibold text-forest">{job.title}</span>
                    {job.company && <> · {job.company}</>}
                    {job.location && (
                      <span className="ml-1 inline-flex items-center gap-0.5 text-forest/50">
                        <MapPin className="h-3 w-3" /> {job.location}
                      </span>
                    )}
                  </span>
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
        )}
      </Card>
    </motion.div>
  );
}

export default function SharedReport() {
  const { token } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.getSharedReport(token).then(setReport).catch((e) => setError(e.message));
  }, [token]);

  const copyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const sortedRecs = report ? [...report.recommendations].sort((a, b) => (b.market_demand_pct ?? 0) - (a.market_demand_pct ?? 0)) : [];
  const avgDemand =
    sortedRecs.length > 0
      ? Math.round(sortedRecs.reduce((sum, r) => sum + (r.market_demand_pct ?? 0), 0) / sortedRecs.length)
      : 0;

  return (
    <div className="min-h-screen bg-cream px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link to="/" className="font-display text-2xl font-bold text-forest">
            NextSkill
          </Link>
          {report && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={copyLink}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy link"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => window.print()}>
                <Printer className="h-3.5 w-3.5" /> Print
              </Button>
              <Button as={Link} to="/signup" size="sm">
                Get your own
              </Button>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-10">
            <ErrorState message="This shared report link is invalid or has been revoked." />
          </div>
        )}
        {!report && !error && <LoadingState label="Loading shared report…" />}

        {report && (
          <div className="mt-8">
            <span className="font-kicker text-xs uppercase tracking-widest text-forest/50">
              Shared skill-gap report
            </span>
            <h1 className="mt-1 font-display text-3xl font-bold capitalize text-forest">{report.resolved_role}</h1>
            <p className="mt-2 text-sm text-forest/55">
              Shared on{" "}
              {new Date(report.shared_at).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <Card className="p-3 text-center">
                <p className="font-display text-xl font-bold text-forest">{report.skills_at_time.length}</p>
                <p className="mt-0.5 text-[11px] uppercase tracking-wide text-forest/45">Skills owned</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="font-display text-xl font-bold text-forest">{sortedRecs.length}</p>
                <p className="mt-0.5 text-[11px] uppercase tracking-wide text-forest/45">Gap skills found</p>
              </Card>
              <Card className="flex flex-col items-center p-3 text-center">
                <span className="flex items-center gap-1 font-display text-xl font-bold text-forest">
                  <TrendingUp className="h-4 w-4 text-forest/50" /> {avgDemand}%
                </span>
                <span className="mt-0.5 flex items-center gap-1 text-[11px] uppercase tracking-wide text-forest/45">
                  Avg. gap demand
                  <InfoHint text="Average share of postings for this role that mention each missing skill." />
                </span>
              </Card>
            </div>

            <div className="mt-6">
              <div className="flex items-center gap-2 text-forest/70">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-kicker text-xs uppercase tracking-widest">Skills at the time</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {report.skills_at_time.length === 0 && <span className="text-sm text-forest/40">None listed</span>}
                {report.skills_at_time.map((s) => (
                  <span
                    key={s}
                    className="rounded-full px-2.5 py-1 text-xs font-medium text-forest"
                    style={{ backgroundColor: colorFor(s), opacity: 0.55 }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 text-forest/70">
              <Target className="h-4 w-4" />
              <span className="font-kicker text-xs uppercase tracking-widest">Top gap skills, ranked by demand</span>
            </div>
            <div className="mt-3 flex flex-col gap-4">
              {sortedRecs.map((rec, i) => (
                <RecommendationCard key={rec.skill} rec={rec} rank={i + 1} />
              ))}
            </div>

            <div className="mt-10 rounded-2xl border border-forest/10 bg-periwinkle/30 px-6 py-6 text-center print:hidden">
              <p className="font-display text-base font-bold text-forest">Want to see your own gaps like this?</p>
              <p className="mt-1 text-sm text-forest/60">Free to start — no credit card, evidence-backed from real postings.</p>
              <Button as={Link} to="/signup" size="sm" className="mt-4">
                Get your own free skill-gap report
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
