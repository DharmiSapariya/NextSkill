import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, Sparkles, ArrowRight } from "lucide-react";
import * as api from "../../lib/api";
import { PageHeader, Card, Button, Badge, LoadingState, ErrorState } from "../ui";
import Autocomplete from "../Autocomplete";

const LIFECYCLE_TONE = {
  emerging: "periwinkle",
  growing: "lime",
  mature: "forest",
  declining: "red",
  niche: "forest",
  insufficient_data: "forest",
};

const TREND_ICON = { rising: TrendingUp, falling: TrendingDown, flat: Minus, new: Sparkles };

function PeriodBar({ label, share }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-forest/55">
        <span>{label}</span>
        <span className="font-semibold text-forest">{share}%</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-forest/8">
        <div className="h-full rounded-full bg-periwinkle" style={{ width: `${Math.min(share * 2, 100)}%` }} />
      </div>
    </div>
  );
}

export default function Trends() {
  const [skill, setSkill] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  const TrendIcon = result ? TREND_ICON[result.trend] || Minus : null;

  return (
    <div>
      <PageHeader
        kicker="Explore"
        title="Trends"
        description="See whether a skill's share of postings is rising, falling, or holding steady — not a forecast, a real two-window comparison."
      />

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
        <div className="mt-8">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl font-bold text-forest">{result.skill}</h2>
              <div className="flex items-center gap-2">
                <Badge tone={LIFECYCLE_TONE[result.lifecycle]} className="capitalize">
                  {result.lifecycle.replace("_", " ")}
                </Badge>
                <span className="flex items-center gap-1 text-sm font-semibold capitalize text-forest/70">
                  <TrendIcon className="h-4 w-4" />
                  {result.trend}
                  {result.change_pct != null && ` (${result.change_pct > 0 ? "+" : ""}${result.change_pct}%)`}
                </span>
              </div>
            </div>

            <p className="mt-1 text-xs text-forest/50">
              {result.total_mentions.toLocaleString()} total mentions across all ingested postings
            </p>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <PeriodBar label={`Previous ${result.window_days}d`} share={result.previous_period.share_pct} />
              <PeriodBar label={`Current ${result.window_days}d`} share={result.current_period.share_pct} />
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
          </Card>

          <p className="mt-4 text-xs leading-relaxed text-forest/40">{result.caveat}</p>
        </div>
      )}
    </div>
  );
}
