import { describe, it, expect } from "vitest";
import type { Citation } from "@/lib/graph/types";
import { parseCitations, buildSubgraphFromPath, LOW_RELEVANCE_THRESHOLD } from "@/lib/graph/citations";
import type { OneHop } from "@/lib/graph/citations";

describe("Citation type", () => {
  it("shapes a retrieved citation", () => {
    const c: Citation = {
      label: "Yiannis",
      nodeId: "n1",
      nodeType: "person",
      slug: "yiannis",
      similarity: 0.9,
      origin: "retrieved",
    };
    expect(c.origin).toBe("retrieved");
    expect(c.nodeId).toBe("n1");
  });

  it("shapes a neighbor citation", () => {
    const c: Citation = {
      label: "Marika",
      nodeId: "n2",
      nodeType: "person",
      slug: "marika",
      similarity: 0,
      origin: "neighbor",
    };
    expect(c.origin).toBe("neighbor");
  });
});

const retrieved: Citation[] = [
  { label: "Yiannis", nodeId: "n1", nodeType: "person", slug: "yiannis", similarity: 0.9, origin: "retrieved" },
  { label: "The Mill", nodeId: "n3", nodeType: "landmark", slug: "the-mill", similarity: 0.45, origin: "retrieved" },
];
const neighbors: Citation[] = [
  { label: "Marika", nodeId: "n2", nodeType: "person", slug: "marika", similarity: 0, origin: "neighbor" },
];

describe("parseCitations", () => {
  it("extracts inline citations and rewrites them to [N] markers", () => {
    const { text, citations } = parseCitations(
      "Yiannis [Yiannis](n1) was a mason who married [Marika](n2).",
      { retrieved, neighbors },
    );
    expect(text).toBe("Yiannis [1] was a mason who married [2].");
    expect(citations).toHaveLength(2);
    expect(citations[0]).toMatchObject({ nodeId: "n1", origin: "retrieved" });
    expect(citations[1]).toMatchObject({ nodeId: "n2", origin: "neighbor" });
  });

  it("deduplicates repeated sources to a single index", () => {
    const { text, citations } = parseCitations(
      "[Yiannis](n1) and his brother [Yiannis](n1) again.",
      { retrieved, neighbors },
    );
    expect(citations).toHaveLength(1);
    expect(text).toBe("[1] and his brother [1] again.");
  });

  it("returns original text with empty citations when no markers present", () => {
    const { text, citations } = parseCitations("No citations here.", { retrieved, neighbors });
    expect(text).toBe("No citations here.");
    expect(citations).toEqual([]);
  });

  it("ignores markers referencing unknown nodeIds", () => {
    const { text, citations } = parseCitations("Saw [Ghost](n999).", { retrieved, neighbors });
    expect(text).toBe("Saw [Ghost](n999).");
    expect(citations).toEqual([]);
  });
});

describe("LOW_RELEVANCE_THRESHOLD", () => {
  it("classifies low-relevance retrieved citations", () => {
    expect(retrieved[1].similarity < LOW_RELEVANCE_THRESHOLD).toBe(true);
    expect(retrieved[0].similarity < LOW_RELEVANCE_THRESHOLD).toBe(false);
  });
});

describe("buildSubgraphFromPath", () => {
  const hops: OneHop[] = [
    { edgeId: "e1", sourceId: "n1", targetId: "n2", verb: "married_to", neighborLabel: "Marika", neighborType: "person" },
    { edgeId: "e2", sourceId: "n1", targetId: "n4", verb: "lived_at", neighborLabel: "Kastro", neighborType: "toponym" },
  ];

  it("collects cited nodes, one-hop neighbors, and connecting edges", () => {
    const sub = buildSubgraphFromPath([retrieved[0], retrieved[1]], hops);
    expect(sub.citedNodeIds.sort()).toEqual(["n1", "n3"]);
    expect(sub.nodeIds).toContain("n2"); // neighbor of n1
    expect(sub.nodeIds).toContain("n4"); // neighbor of n1
    expect(sub.nodeIds).toContain("n3"); // cited node
    expect(sub.edgeIds).toEqual(["e1", "e2"]);
  });

  it("keeps a single cited node as nodeIds = [that node]", () => {
    const sub = buildSubgraphFromPath([retrieved[1]], []);
    expect(sub.citedNodeIds).toEqual(["n3"]);
    expect(sub.nodeIds).toEqual(["n3"]);
    expect(sub.edgeIds).toEqual([]);
  });
});
