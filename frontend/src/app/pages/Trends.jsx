import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Sparkles, ArrowRight, ChevronDown, Scale, X } from "lucide-react";
import * as api from "../../lib/api";
import { PageHeader, Card, Button, Badge, LoadingState, ErrorState, InfoHint } from "../ui";
import Autocomplete from "../Autocomplete";

const LIFECYCLE_HINT = {
  emerging: "New enough that we don't have a long track record yet, but growing fast.",
  growing: "Its share of postings is meaningfully up over the comparison window.",
  mature: "Consistently in demand with a stable, established share of postings.",
  declining: "Its share of postings has meaningfully dropped over the comparison window.",
  niche: "Present, but only in a small, steady slice of postings.",
  insufficient_data: "Not enough mentions yet to classify a trend confidently.",
};

const LIFECYCLE_TONE = {
  emerging: "periwinkle",
  growing: "lime",
  mature: "forest",
  declining: "red",
  niche: "forest",
  insufficient_data: "forest",
};

const TREND_ICON = { rising: TrendingUp, falling: TrendingDown, flat: Minus, new: Sparkles };
const TREND_COLOR = { rising: "var(--lime)", falling: "var(--coral)", flat: "var(--periwinkle)", new: "var(--periwinkle)" };

function formatDateRange(startIso, endIso) {
  const opts = { month: "short", day: "numeric" };
  return `${new Date(startIso).toLocaleDateString(undefined, opts)} – ${new Date(endIso).toLocaleDateString(undefined, opts)}`;
}

function PeriodBar({ label, dateRange, share }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-forest/55">
        <span>
          {label} <span className="text-forest/35">· {dateRange}</span>
        </span>
        <span className="font-semibold text-forest">{share}%</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-forest/8">
        <motion.div
          className="h-full rounded-full bg-periwinkle"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(share * 2, 100)}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// Two circles sized by their actual share, connected by an arrow colored to
// match the trend direction — the shift reads visually, not just as text.
function ShareFlow({ previousShare, currentShare, trendColor }) {
  const maxShare = Math.max(previousShare, currentShare, 1);
  const prevSize = 44 + (previousShare / maxShare) * 36;
  const currSize = 44 + (currentShare / maxShare) * 36;
  return (
    <div className="flex items-center justify-center gap-5 py-2">
      <div className="flex flex-col items-center gap-1.5">
        <span
          className="flex items-center justify-center rounded-full bg-forest/8 font-display font-bold text-forest"
          style={{ width: prevSize, height: prevSize }}
        >
          {previousShare}%
        </span>
        <span className="text-[11px] text-forest/45">previous</span>
      </div>
      <ArrowRight className="h-5 w-5 shrink-0" style={{ color: trendColor }} />
      <div className="flex flex-col items-center gap-1.5">
        <motion.span
          className="flex items-center justify-center rounded-full font-display font-bold text-forest"
          style={{ width: currSize, height: currSize, backgroundColor: trendColor }}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {currentShare}%
        </motion.span>
        <span className="text-[11px] text-forest/45">current</span>
      </div>
    </div>
  );
}

function MethodologyPanel({ methodology, caveat }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-5 border-t border-forest/10 pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-semibold text-forest/50 hover:text-forest"
      >
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        How this is calculated
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-2">
          <p className="text-xs leading-relaxed text-forest/55">{methodology}</p>
          <p className="text-xs leading-relaxed text-forest/40">{caveat}</p>
        </div>
      )}
    </div>
  );
}

function TrendPanel({ result }) {
  const TrendIcon = TREND_ICON[result.trend] || Minus;
  const trendColor = TREND_COLOR[result.trend] || "var(--periwinkle)";

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-forest">{result.skill}</h2>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5">
            <Badge tone={LIFECYCLE_TONE[result.lifecycle]} className="capitalize">
              {result.lifecycle.replace("_", " ")}
            </Badge>
            <InfoHint text={LIFECYCLE_HINT[result.lifecycle] || "Lifecycle classification based on posting share over time."} />
          </span>
          <span
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-forest"
            style={{ backgroundColor: trendColor, opacity: 0.85 }}
          >
            <TrendIcon className="h-3.5 w-3.5" />
            {result.trend}
            {result.change_pct != null && ` (${result.change_pct > 0 ? "+" : ""}${result.change_pct}%)`}
          </span>
        </div>
      </div>

      <p className="mt-1 text-xs text-forest/50">
        {result.total_mentions.toLocaleString()} total mentions across all ingested postings
      </p>

      <ShareFlow previousShare={result.previous_period.share_pct} currentShare={result.current_period.share_pct} trendColor={trendColor} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PeriodBar
          label={`Previous ${result.window_days}d`}
          dateRange={formatDateRange(result.previous_period.start, result.previous_period.end)}
          share={result.previous_period.share_pct}
        />
        <PeriodBar
          label={`Current ${result.window_days}d`}
          dateRange={formatDateRange(result.current_period.start, result.current_period.end)}
          share={result.current_period.share_pct}
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 text-xs text-forest/55 sm:grid-cols-4">
        <div>
          <p className="font-semibold text-forest">{result.previous_period.mentions.toLocaleString()}</p>
          <p>prev. mentions</p>
        </div>
        <div>
          <p className="font-semibold text-forest">{result.current_period.mentions.toLocaleString()}</p>
          <p>current mentions</p>
        </div>
        <div>
          <p className="font-semibold text-forest">{result.previous_period.of_postings.toLocaleString()}</p>
          <p>prev. postings</p>
        </div>
        <div>
          <p className="font-semibold text-forest">{result.current_period.of_postings.toLocaleString()}</p>
          <p>current postings</p>
        </div>
      </div>

      <MethodologyPanel methodology={result.methodology} caveat={result.caveat} />
    </Card>
  );
}

export default function Trends() {
  const [searchParams] = useSearchParams();
  const [skill, setSkill] = useState(searchParams.get("skill") || "");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [compareOpen, setCompareOpen] = useState(false);
  const [compareSkill, setCompareSkill] = useState("");
  const [compareResult, setCompareResult] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!skill.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.getSkillTrend(skill.trim());
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompareSubmit = async (e) => {
    e.preventDefault();
    if (!compareSkill.trim()) return;
    setCompareLoading(true);
    setCompareError(null);
    setCompareResult(null);
    try {
      const data = await api.getSkillTrend(compareSkill.trim());
      setCompareResult(data);
    } catch (err) {
      setCompareError(err.message);
    } finally {
      setCompareLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        kicker="Explore"
        title="Trends"
        description="See whether a skill's share of postings is rising, falling, or holding steady — not a forecast, a real two-window comparison."
      />

      <div className="mb-8 flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-2xl border border-forest/10 bg-periwinkle/30 px-6 py-6 sm:px-8">
        <div>
          <span className="font-kicker text-xs uppercase tracking-widest text-forest/50">Two real windows</span>
          <p className="mt-2 max-w-xl font-display text-xl font-bold text-forest sm:text-2xl">
            Compares two adjacent posting windows for a skill — real share of postings, not a projection.
          </p>
        </div>
        <img src="/illustrations/3n.png" alt="" className="hidden h-28 w-28 shrink-0 object-contain sm:block" />
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
          <div className="min-w-[220px] flex-1">
            <Autocomplete
              label="Skill name"
              placeholder="e.g. PyTorch"
              value={skill}
              onChange={setSkill}
              onSelect={setSkill}
              getOptions={(q) => api.getSkills({ q, limit: 8 }).then((res) => res.results.map((s) => s.name))}
            />
          </div>
          <Button type="submit" disabled={loading || !skill.trim()}>
            {loading ? "Looking…" : "Check trend"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>
      </Card>

      {loading && <LoadingState label="Comparing recent posting windows…" />}
      {error && <ErrorState message={error} />}

      {result && (
        <>
          <div className="mt-6">
            {!compareOpen ? (
              <button
                type="button"
                onClick={() => setCompareOpen(true)}
                className="flex items-center gap-1.5 text-sm font-semibold text-forest/60 hover:text-forest"
              >
                <Scale className="h-4 w-4" /> Compare with another skill
              </button>
            ) : (
              <Card>
                <form onSubmit={handleCompareSubmit} className="flex flex-wrap items-end gap-4">
                  <div className="min-w-[220px] flex-1">
                    <Autocomplete
                      label="Compare against"
                      placeholder="e.g. TensorFlow"
                      value={compareSkill}
                      onChange={setCompareSkill}
                      onSelect={setCompareSkill}
                      getOptions={(q) => api.getSkills({ q, limit: 8 }).then((res) => res.results.map((s) => s.name))}
                    />
                  </div>
                  <Button type="submit" variant="secondary" disabled={compareLoading || !compareSkill.trim()}>
                    {compareLoading ? "Comparing…" : "Compare"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setCompareOpen(false);
                      setCompareSkill("");
                      setCompareResult(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </form>
              </Card>
            )}
          </div>

          {compareLoading && <LoadingState label="Comparing the second skill…" />}
          {compareError && <ErrorState message={compareError} />}

          {compareResult ? (
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <TrendPanel result={result} />
              <TrendPanel result={compareResult} />
            </div>
          ) : (
            <div className="mt-6">
              <TrendPanel result={result} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
