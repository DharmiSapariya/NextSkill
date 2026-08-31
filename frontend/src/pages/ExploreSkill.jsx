import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, Search } from "lucide-react";
import { apiGet } from "../lib/api";
import FeatureHeader from "./shared/FeatureHeader";
import Card from "./shared/Card";
import { EmptyState, ErrorState, LoadingState } from "./shared/RequestState";

const TREND_ICON = { rising: ArrowUp, falling: ArrowDown, flat: ArrowRight, new: ArrowUp };
const TREND_TONE = {
  rising: "text-forest bg-lime/40",
  falling: "text-danger bg-danger/10",
  flat: "text-charcoal/60 bg-forest/8",
  new: "text-forest bg-periwinkle/40",
};

function useDebounced(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function SkillSearch({ onSelect }) {
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query);
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!debounced.trim()) {
      setSuggestions([]);
      return;
    }
    apiGet("/skills", { params: { q: debounced, limit: 8 } }).then(({ ok, data }) => {
      if (ok) setSuggestions(data.results);
    });
  }, [debounced]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={boxRef} className="relative max-w-md">
      <label className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-charcoal/40" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search a skill — React, Docker, SQL…"
          className="w-full rounded-xl border border-forest/15 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-forest/40"
        />
      </label>
      {open && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-forest/15 bg-white shadow-lg">
          {suggestions.map((skill) => (
            <li key={skill.name}>
              <button
                onClick={() => {
                  onSelect(skill.name);
                  setQuery(skill.name);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-periwinkle/15"
              >
                <span className="font-medium text-charcoal">{skill.name}</span>
                <span className="font-sans text-xs text-charcoal/40">{skill.mention_count} mentions</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TrendCard({ skill }) {
  const [state, setState] = useState({ status: "loading", data: null });

  useEffect(() => {
    setState({ status: "loading", data: null });
    apiGet(`/trends/${encodeURIComponent(skill)}`).then(({ ok, data }) => {
      setState(ok ? { status: "ready", data } : { status: "error", data });
    });
  }, [skill]);

  if (state.status === "loading") return <LoadingState label="Computing demand trend…" />;
  if (state.status === "error") return <ErrorState message={state.data?.detail || "No trend data for this skill yet."} />;

  const d = state.data;
  const Icon = TREND_ICON[d.trend] || ArrowRight;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${TREND_TONE[d.trend]}`}>
          <Icon className="h-3.5 w-3.5" />
          {d.trend}
        </span>
        <span className="font-sans text-xs uppercase tracking-wide text-charcoal/40">{d.lifecycle.replace(/_/g, " ")}</span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total mentions" value={d.total_mentions} />
        <Stat label="Current share" value={`${d.current_period.share_pct}%`} />
        <Stat label="Previous share" value={`${d.previous_period.share_pct}%`} />
        <Stat label="Change" value={`${d.change_pct > 0 ? "+" : ""}${d.change_pct}%`} />
      </div>

      <p className="mt-5 font-sans text-xs leading-relaxed text-charcoal/50">{d.methodology}</p>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="font-display text-2xl font-bold text-charcoal">{value}</div>
      <div className="font-sans text-[11px] uppercase tracking-wide text-charcoal/40">{label}</div>
    </div>
  );
}

function RelatedSkills({ skill, onSelect }) {
  const [state, setState] = useState({ status: "loading", data: null });

  useEffect(() => {
    setState({ status: "loading", data: null });
    apiGet(`/skills/${encodeURIComponent(skill)}/related`, { params: { limit: 10 } }).then(({ ok, data }) => {
      setState(ok ? { status: "ready", data } : { status: "error", data: null });
    });
  }, [skill]);

  if (state.status === "loading") return <LoadingState label="Finding related skills…" />;
  if (state.status === "error") return <ErrorState message="Couldn't load related skills." />;
  if (!state.data.related_skills.length) return <EmptyState message="No co-occurring skills found yet." />;

  return (
    <ul className="flex flex-wrap gap-2">
      {state.data.related_skills.map((rel) => (
        <li key={rel.skill}>
          <button
            onClick={() => onSelect(rel.skill)}
            className="flex items-center gap-2 rounded-full border border-forest/15 bg-white px-3.5 py-1.5 text-sm text-charcoal transition-colors hover:border-forest/40"
          >
            {rel.skill}
            <span className="text-xs text-charcoal/40">{rel.co_occurrences}×</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function ExploreSkill() {
  const [skill, setSkill] = useState("Python");

  return (
    <section className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      <FeatureHeader
        eyebrow="One skill, in context"
        title="Explore a Skill"
        subtitle="Demand trends and adjacent skills — pulled from live job postings, not a static glossary."
        illustration="/illustrations/explore-skill.png"
      />

      <div className="mt-10">
        <SkillSearch onSelect={setSkill} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6">
        <Card eyebrow="Market demand" title={skill} tone="periwinkle">
          <TrendCard skill={skill} />
        </Card>
        <Card eyebrow="Commonly asked for alongside it" title="Related skills" tone="lime">
          <RelatedSkills skill={skill} onSelect={setSkill} />
        </Card>
      </div>
    </section>
  );
}
