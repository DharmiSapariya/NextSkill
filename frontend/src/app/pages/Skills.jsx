import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Tags } from "lucide-react";
import * as api from "../../lib/api";
import { PageHeader, Card, Button, Badge, LoadingState, ErrorState, EmptyState } from "../ui";
import Autocomplete from "../Autocomplete";
import { colorFor } from "../../lib/skillCategories";

const PAGE_SIZE = 24;

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

  return (
    <div>
      <PageHeader kicker="Explore" title="Skills" description="Every skill we've actually seen mentioned in a real posting." />

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
          {!data && !error && <LoadingState label="Loading skills…" />}
          {error && <ErrorState message={error} />}

          {data && data.results.length === 0 && <EmptyState title="No skills found" />}

          {data && data.results.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {data.results.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => selectSkill(s.name)}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                      selected === s.name
                        ? "border-forest bg-forest text-cream"
                        : "border-forest/10 bg-white/60 text-forest hover:border-forest/25"
                    }`}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: selected === s.name ? "var(--cream)" : colorFor(s.name) }}
                      />
                      {s.name}
                    </span>
                    <span className={`text-xs ${selected === s.name ? "text-cream/70" : "text-forest/45"}`}>
                      {s.mention_count.toLocaleString()}
                    </span>
                  </button>
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
              <p className="mt-3 text-sm font-semibold text-forest">{related.skill}</p>
              <p className="text-xs text-forest/45">Based on {related.based_on_postings.toLocaleString()} postings</p>
              <div className="mt-3 flex flex-col gap-2">
                {related.related_skills.map((r) => (
                  <div key={r.skill} className="flex items-center justify-between text-sm">
                    <span className="text-forest/80">{r.skill}</span>
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
