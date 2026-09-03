import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Tags, Share2, TrendingUp } from "lucide-react";
import * as api from "../../lib/api";
import { PageHeader, Card, Button, Badge, LoadingState, ErrorState, EmptyState, Skeleton } from "../ui";
import Autocomplete from "../Autocomplete";
import { colorFor, categoryFor, CATEGORY_COLORS } from "../../lib/skillCategories";

const PAGE_SIZE = 24;

// Honest and page-scoped — how the currently loaded page of skills splits
// by category, never implied to be the full taxonomy's distribution.
function CategoryMix({ skills }) {
  if (skills.length === 0) return null;
  const counts = {};
  skills.forEach((s) => {
    const cat = categoryFor(s.name);
    counts[cat] = (counts[cat] || 0) + 1;
  });
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const total = skills.length;

  return (
    <div className="mb-4">
      <div className="flex h-1.5 overflow-hidden rounded-full bg-forest/8">
        {entries.map(([cat, n]) => (
          <motion.div
            key={cat}
            initial={{ width: 0 }}
            animate={{ width: `${(n / total) * 100}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{ backgroundColor: CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-forest/45">
        {entries.map(([cat, n]) => (
          <span key={cat} className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other }} />
            {cat} · {n}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Skills() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "0", 10);

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [related, setRelated] = useState(null);
  const [relatedLoading, setRelatedLoading] = useState(false);

  useEffect(() => {
    setData(null);
    setError(null);
    const params = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
    if (q) params.q = q;
    api.getSkills(params).then(setData).catch((e) => setError(e.message));
  }, [q, page]);

  const [liveQuery, setLiveQuery] = useState(q);
  const liveDebounceRef = useRef(null);

  const updateQuery = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("q", value);
    else next.delete("q");
    next.delete("page");
    setSearchParams(next);
  };

  const handleLiveChange = (value) => {
    setLiveQuery(value);
    clearTimeout(liveDebounceRef.current);
    liveDebounceRef.current = setTimeout(() => updateQuery(value), 220);
  };

  const goToPage = (p) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", p);
    setSearchParams(next);
  };

  const selectSkill = (name) => {
    setSelected(name);
    setRelated(null);
    setRelatedLoading(true);
    api
      .getRelatedSkills(name, 12)
      .then(setRelated)
      .finally(() => setRelatedLoading(false));
  };

  const maxMentions = useMemo(
    () => (data && data.results.length > 0 ? Math.max(...data.results.map((s) => s.mention_count)) : 1),
    [data]
  );

  return (
    <div>
      <PageHeader kicker="Explore" title="Skills" description="Every skill we've actually seen mentioned in a real posting." />

      <div className="mb-8 flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-2xl border border-forest/10 bg-sky/25 px-6 py-6 sm:px-8">
        <div>
          <span className="font-kicker text-xs uppercase tracking-widest text-forest/50">Skill library</span>
          <p className="mt-2 max-w-xl font-display text-xl font-bold text-forest sm:text-2xl">
            {data ? `${data.total.toLocaleString()} skills` : "Skills"} pulled straight from real postings — nothing invented.
          </p>
        </div>
        <img src="/illustrations/7n.png" alt="" className="hidden h-28 w-28 shrink-0 object-contain sm:block" />
      </div>

      <Card>
        <Autocomplete
          label="Search skills"
          placeholder="e.g. Kubernetes — start typing"
          value={liveQuery}
          onChange={handleLiveChange}
          onSelect={(name) => {
            setLiveQuery(name);
            updateQuery(name);
          }}
          getOptions={(query) => api.getSkills({ q: query, limit: 8 }).then((res) => res.results.map((s) => s.name))}
        />
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[1fr_320px]">
        <div>
          {!data && !error && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-[52px]" />
              ))}
            </div>
          )}
          {error && <ErrorState message={error} />}

          {data && data.results.length === 0 && <EmptyState title="No skills found" />}

          {data && data.results.length > 0 && (
            <>
              <CategoryMix skills={data.results} />

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {data.results.map((s, i) => (
                  <motion.button
                    key={s.name}
                    type="button"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(i, 12) * 0.02 }}
                    onClick={() => selectSkill(s.name)}
                    className={`flex flex-col gap-1.5 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                      selected === s.name
                        ? "border-forest bg-forest text-cream"
                        : "border-forest/10 bg-white/60 text-forest hover:border-forest/25"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2 font-medium">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: selected === s.name ? "var(--cream)" : colorFor(s.name) }}
                        />
                        <span className="truncate">{s.name}</span>
                      </span>
                      <span className={`shrink-0 text-xs ${selected === s.name ? "text-cream/70" : "text-forest/45"}`}>
                        {s.mention_count.toLocaleString()}
                      </span>
                    </div>
                    <div className={`h-1 overflow-hidden rounded-full ${selected === s.name ? "bg-cream/20" : "bg-forest/8"}`}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(4, (s.mention_count / maxMentions) * 100)}%`,
                          backgroundColor: selected === s.name ? "var(--cream)" : colorFor(s.name),
                          opacity: selected === s.name ? 0.8 : 1,
                        }}
                      />
                    </div>
                  </motion.button>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => goToPage(page - 1)}>
                  <ArrowLeft className="h-3.5 w-3.5" /> Previous
                </Button>
                <span className="text-xs text-forest/50">
                  Page {page + 1} of {Math.max(1, Math.ceil(data.total / PAGE_SIZE))}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={(page + 1) * PAGE_SIZE >= data.total}
                  onClick={() => goToPage(page + 1)}
                >
                  Next <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </>
          )}
        </div>

        <Card className="h-fit">
          <div className="flex items-center gap-2 text-forest/70">
            <Tags className="h-4 w-4" />
            <span className="font-kicker text-xs uppercase tracking-widest">Related skills</span>
          </div>

          {!selected && <p className="mt-3 text-sm text-forest/50">Pick a skill to see what commonly appears alongside it.</p>}

          {selected && relatedLoading && <LoadingState label="Loading…" />}

          {selected && related && (
            <>
              <div className="mt-3 flex items-center gap-2">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: colorFor(related.skill) }} />
                <p className="text-sm font-semibold text-forest">{related.skill}</p>
              </div>
              <p className="text-xs text-forest/45">Based on {related.based_on_postings.toLocaleString()} postings</p>

              <div className="mt-3 flex gap-2">
                <Button as={Link} to="/app/skill-graph" variant="secondary" size="sm" className="flex-1">
                  <Share2 className="h-3.5 w-3.5" /> Graph
                </Button>
                <Button as={Link} to={`/app/trends?skill=${encodeURIComponent(related.skill)}`} variant="secondary" size="sm" className="flex-1">
                  <TrendingUp className="h-3.5 w-3.5" /> Trend
                </Button>
              </div>

              <div className="mt-4 flex flex-col gap-2.5">
                {related.related_skills.map((r) => (
                  <div key={r.skill} className="flex items-center gap-2 text-sm">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colorFor(r.skill) }} />
                    <span className="min-w-0 flex-1 truncate text-forest/80">{r.skill}</span>
                    <div className="h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-forest/8">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: colorFor(r.skill) }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(r.co_occurrence_pct, 100)}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    </div>
                    <Badge tone="periwinkle">{r.co_occurrence_pct}%</Badge>
                  </div>
                ))}
                {related.related_skills.length === 0 && (
                  <p className="text-sm text-forest/50">No related skills found.</p>
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
