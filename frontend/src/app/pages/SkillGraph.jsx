import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import * as api from "../../lib/api";
import { PageHeader, Card, Badge, LoadingState, ErrorState } from "../ui";
import ForceGraph from "../ForceGraph";
import { colorFor, CATEGORY_COLORS } from "../../lib/skillCategories";

export default function SkillGraph() {
  const [graph, setGraph] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.getSkillCoOccurrenceGraph().then(setGraph).catch((e) => setError(e.message));
  }, []);

  const connectionsFor = (name) =>
    graph
      ? graph.edges
          .filter((e) => e.source === name || e.target === name)
          .sort((a, b) => b.weight - a.weight)
          .slice(0, 10)
          .map((e) => ({ other: e.source === name ? e.target : e.source, weight: e.weight }))
      : [];

  const selectedNode = graph?.nodes.find((n) => n.id === selected);

  return (
    <div>
      <PageHeader
        kicker="Explore"
        title="Skill Graph"
        description="The most-mentioned skills, sized by mention count — edges show how strongly two skills co-occur in the same postings. Click a skill to see its strongest connections."
      />

      {error && <ErrorState message={error} />}
      {!graph && !error && <LoadingState label="Building the skill network…" />}

      {graph && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_300px]">
          <Card className="p-2 sm:p-4">
            <div className="h-[420px] w-full sm:h-[520px]">
              <ForceGraph
                nodes={graph.nodes.map((n) => ({ id: n.id, label: n.label, value: n.mention_count }))}
                edges={graph.edges}
                color={(node) => colorFor(node.label)}
                selectedId={selected}
                onNodeClick={(node) => setSelected(node.id === selected ? null : node.id)}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-forest/10 px-2 pt-3">
              {Object.entries(CATEGORY_COLORS)
                .filter(([category]) => category !== "Other")
                .map(([category, cssVar]) => (
                  <span key={category} className="flex items-center gap-1.5 text-[11px] text-forest/55">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cssVar }} />
                    {category}
                  </span>
                ))}
            </div>
          </Card>

          <Card className="h-fit">
            <div className="flex items-center gap-2 text-forest/70">
              <Share2 className="h-4 w-4" />
              <span className="font-kicker text-xs uppercase tracking-widest">Connections</span>
            </div>

            {!selectedNode && (
              <p className="mt-3 text-sm text-forest/50">Click a node to see what it co-occurs with most.</p>
            )}

            {selectedNode && (
              <>
                <p className="mt-3 text-sm font-semibold text-forest">{selectedNode.label}</p>
                <p className="text-xs text-forest/45">{selectedNode.mention_count.toLocaleString()} mentions</p>
                <div className="mt-3 flex flex-col gap-2">
                  {connectionsFor(selected).map((c) => (
                    <div key={c.other} className="flex items-center justify-between text-sm">
                      <span className="text-forest/80">{c.other}</span>
                      <Badge tone="periwinkle">{Math.round(c.weight * 100)}%</Badge>
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
      )}
    </div>
  );
}
