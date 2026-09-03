import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import * as api from "../../lib/api";
import { PageHeader, Card, Badge, LoadingState, ErrorState } from "../ui";

export default function SkillGraph() {
  const [graph, setGraph] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getSkillCoOccurrenceGraph().then(setGraph).catch((e) => setError(e.message));
  }, []);

  const topNodes = graph
    ? graph.nodes.slice().sort((a, b) => b.mention_count - a.mention_count)
    : [];

  const edgesByNode = (name) =>
    graph
      ? graph.edges
          .filter((e) => e.source === name || e.target === name)
          .sort((a, b) => b.weight - a.weight)
          .slice(0, 6)
          .map((e) => ({ other: e.source === name ? e.target : e.source, weight: e.weight }))
      : [];

  return (
    <div>
      <PageHeader
        kicker="Explore"
        title="Skill Graph"
        description="The most-mentioned skills and which other skills they co-occur with most strongly across real postings."
      />

      {error && <ErrorState message={error} />}
      {!graph && !error && <LoadingState label="Building the skill network…" />}

      {graph && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {topNodes.map((node) => {
            const connections = edgesByNode(node.id);
            return (
              <Card key={node.id}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-base font-bold text-forest">{node.label}</h3>
                  <span className="text-xs text-forest/45">{node.mention_count.toLocaleString()} mentions</span>
                </div>
                {connections.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Share2 className="mt-1 h-3.5 w-3.5 shrink-0 text-forest/30" />
                    {connections.map((c) => (
                      <Badge key={c.other} tone="periwinkle">
                        {c.other} · {Math.round(c.weight * 100)}%
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-forest/40">No strong co-occurrences above threshold.</p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
