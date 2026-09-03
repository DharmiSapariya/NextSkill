import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Share2, Award } from "lucide-react";
import * as api from "../../lib/api";
import { PageHeader, Card, Badge, LoadingState, ErrorState, InfoHint } from "../ui";
import ForceGraph from "../ForceGraph";
import Autocomplete from "../Autocomplete";
import { colorFor, categoryFor, CATEGORY_COLORS } from "../../lib/skillCategories";

const CATEGORIES = Object.keys(CATEGORY_COLORS).filter((c) => c !== "Other");

export default function SkillGraph() {
  const [graph, setGraph] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [activeCategories, setActiveCategories] = useState(() => new Set());
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.getSkillCoOccurrenceGraph().then(setGraph).catch((e) => setError(e.message));
  }, []);

  const connectionsFor = (name) =>
    graph
      ? graph.edges
          .filter((e) => e.source === name || e.target === name)
          .sort((a, b) => b.weight - a.weight)
          .slice(0, 10)
          .map((e) => ({
            other: e.source === name ? e.target : e.source,
            weight: e.weight,
            sharedPostings: e.shared_posting_count,
          }))
      : [];

  const selectedNode = graph?.nodes.find((n) => n.id === selected);
  const maxMentions = graph ? Math.max(1, ...graph.nodes.map((n) => n.mention_count)) : 1;

  const toggleCategory = (cat) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const dimmedIds = useMemo(() => {
    if (!graph || activeCategories.size === 0) return undefined;
    const set = new Set();
    graph.nodes.forEach((n) => {
      if (!activeCategories.has(categoryFor(n.label))) set.add(n.id);
    });
    return set;
  }, [graph, activeCategories]);

  // "Most connected" is a real graph-degree count, not popularity or demand —
  // how many other top skills each one co-occurs strongly enough with to
  // earn an edge at all.
  const mostConnected = useMemo(() => {
    if (!graph) return [];
    const degree = {};
    graph.edges.forEach((e) => {
      degree[e.source] = (degree[e.source] || 0) + 1;
      degree[e.target] = (degree[e.target] || 0) + 1;
    });
    return Object.entries(degree)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({ id, count }));
  }, [graph]);

  return (
    <div>
      <PageHeader
        kicker="Explore"
        title="Skill Graph"
        description="The most-mentioned skills, sized by mention count — edges show how strongly two skills co-occur in the same postings. Click a skill to see its strongest connections."
      />

      <div className="mb-8 flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-2xl border border-forest/10 bg-violet/25 px-6 py-6 sm:px-8">
        <div>
          <span className="font-kicker text-xs uppercase tracking-widest text-forest/50">Skill landscape</span>
          <p className="mt-2 max-w-xl font-display text-xl font-bold text-forest sm:text-2xl">
            {graph ? `${graph.nodes.length} top skills` : "Top skills"} connected by how often they actually appear
            together in real postings.
          </p>
        </div>
        <img src="/illustrations/9n.png" alt="" className="hidden h-28 w-28 shrink-0 object-contain sm:block" />
      </div>

      {error && <ErrorState message={error} />}
      {!graph && !error && <LoadingState label="Building the skill network…" />}

      {graph && (
        <>
          <Card className="mb-6">
            <Autocomplete
              label="Find a skill in the graph"
              placeholder="e.g. React"
              value={search}
              onChange={setSearch}
              onSelect={(name) => {
                const node = graph.nodes.find((n) => n.label.toLowerCase() === name.toLowerCase());
                if (node) {
                  setSelected(node.id);
                  setSearch("");
                }
              }}
              getOptions={(q) =>
                graph.nodes
                  .filter((n) => n.label.toLowerCase().includes(q.trim().toLowerCase()))
                  .slice(0, 8)
                  .map((n) => n.label)
              }
            />
          </Card>

          <div className="mb-4 flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeCategories.has(cat) ? "text-forest" : "bg-forest/6 text-forest/50 hover:bg-forest/12"
                }`}
                style={activeCategories.has(cat) ? { backgroundColor: CATEGORY_COLORS[cat], opacity: 0.9 } : undefined}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
                {cat}
              </button>
            ))}
            {activeCategories.size > 0 && (
              <button
                type="button"
                onClick={() => setActiveCategories(new Set())}
                className="text-xs font-semibold text-forest/45 hover:text-forest/70"
              >
                Clear filter
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_300px]">
            <div className="flex flex-col gap-4">
              <Card className="p-2 sm:p-4">
                <div className="h-[420px] w-full sm:h-[520px]">
                  <ForceGraph
                    nodes={graph.nodes.map((n) => ({ id: n.id, label: n.label, value: n.mention_count }))}
                    edges={graph.edges}
                    color={(node) => colorFor(node.label)}
                    selectedId={selected}
                    dimmedIds={dimmedIds}
                    onNodeClick={(node) => setSelected(node.id === selected ? null : node.id)}
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-forest/10 px-2 pt-3">
                  {CATEGORIES.map((category) => (
                    <span key={category} className="flex items-center gap-1.5 text-[11px] text-forest/55">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[category] }} />
                      {category}
                    </span>
                  ))}
                </div>
              </Card>

              <Card>
                <div className="flex items-center gap-2 text-forest/70">
                  <Award className="h-4 w-4" />
                  <span className="font-kicker text-xs uppercase tracking-widest">Most connected skills</span>
                  <InfoHint text="How many other top skills each one shares a strong co-occurrence edge with — a hub in the network, not necessarily the most mentioned." />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {mostConnected.map((m, i) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelected(m.id === selected ? null : m.id)}
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-forest transition-transform hover:scale-105"
                      style={{ backgroundColor: colorFor(m.id), opacity: selected === m.id ? 1 : 0.65 }}
                    >
                      <span className="font-display">{i + 1}</span>
                      {m.id}
                      <span className="text-forest/50">· {m.count}</span>
                    </button>
                  ))}
                </div>
              </Card>
            </div>

            <Card className="h-fit">
              <div className="flex items-center gap-2 text-forest/70">
                <Share2 className="h-4 w-4" />
                <span className="font-kicker text-xs uppercase tracking-widest">Connections</span>
              </div>

              {!selectedNode && (
                <p className="mt-3 text-sm text-forest/50">Click a node, search above, or pick a hub skill to see its strongest connections.</p>
              )}

              {selectedNode && (
                <>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: colorFor(selectedNode.label) }} />
                    <p className="text-sm font-semibold text-forest">{selectedNode.label}</p>
                  </div>
                  <p className="text-xs text-forest/45">{categoryFor(selectedNode.label)}</p>
                  <p className="mt-1 text-xs text-forest/45">{selectedNode.mention_count.toLocaleString()} mentions</p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-forest/8">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: colorFor(selectedNode.label) }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(selectedNode.mention_count / maxMentions) * 100}%` }}
                      transition={{ duration: 0.7, ease: "easeOut" }}
                    />
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    {connectionsFor(selected).map((c) => (
                      <div key={c.other} className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex min-w-0 items-center gap-1.5 text-forest/80">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colorFor(c.other) }} />
                          <span className="truncate">{c.other}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          {c.sharedPostings != null && (
                            <span className="text-[11px] text-forest/40">{c.sharedPostings.toLocaleString()} postings</span>
                          )}
                          <Badge tone="periwinkle">{Math.round(c.weight * 100)}%</Badge>
                        </span>
                      </div>
                    ))}
                    {connectionsFor(selected).length === 0 && (
                      <p className="text-sm text-forest/50">No strong co-occurrences above threshold.</p>
                    )}
                  </div>
                </>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
