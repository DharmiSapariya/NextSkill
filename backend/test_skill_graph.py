from skill_graph import build_skill_co_occurrence_graph


def test_graph_has_nodes_and_edges_shaped_like_transition_graph():
    graph = build_skill_co_occurrence_graph()
    assert "nodes" in graph and "edges" in graph
    assert len(graph["nodes"]) > 0
    for node in graph["nodes"]:
        assert set(node.keys()) == {"id", "label", "mention_count"}
    for edge in graph["edges"]:
        assert set(edge.keys()) == {"source", "target", "weight", "shared_posting_count"}
        assert 0 < edge["weight"] <= 1  # Jaccard similarity is always in (0, 1] for an included edge


def test_respects_limit_parameter():
    graph = build_skill_co_occurrence_graph(limit=5)
    assert len(graph["nodes"]) <= 5


def test_nodes_are_ordered_by_mention_count_descending():
    graph = build_skill_co_occurrence_graph()
    counts = [n["mention_count"] for n in graph["nodes"]]
    assert counts == sorted(counts, reverse=True)


def test_finds_a_real_known_co_occurrence_pair():
    # JavaScript and React co-occur constantly in real frontend postings —
    # if the seeded fixture data doesn't produce this edge, something in the
    # similarity computation itself is broken, not just a data artifact.
    graph = build_skill_co_occurrence_graph()
    pairs = {frozenset([e["source"], e["target"]]) for e in graph["edges"]}
    assert frozenset(["JavaScript", "React"]) in pairs
