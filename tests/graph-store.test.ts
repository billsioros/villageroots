import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GraphNode } from "@/lib/graph/types";

vi.mock("@/lib/graph/query-client", () => {
  const queryClient = {
    getQueryData: vi.fn(),
    setQueryData: vi.fn(),
  };
  return { queryClient };
});

import { useGraphStore } from "@/store/graphStore";
import { queryClient } from "@/lib/graph/query-client";

const mockQC = vi.mocked(queryClient);

function stubNode(id: string): GraphNode {
  return {
    id,
    type: "person",
    label: id,
    subtitle: "",
    description: "",
    color: "#e15a72",
    mark: "P",
    x: 0,
    y: 0,
  };
}

describe("contribution modal store state", () => {
  beforeEach(() => {
    useGraphStore.setState({ newNodeOpen: false });
  });

  it("opens and closes the contribution modal", () => {
    useGraphStore.getState().setNewNodeOpen(true);
    expect(useGraphStore.getState().newNodeOpen).toBe(true);
    useGraphStore.getState().setNewNodeOpen(false);
    expect(useGraphStore.getState().newNodeOpen).toBe(false);
  });

  it("no longer exposes the removed weave start step", () => {
    const s = useGraphStore.getState() as unknown as Record<string, unknown>;
    expect(s.newNodeStartStep).toBeUndefined();
    expect(s.setNewNodeStartStep).toBeUndefined();
  });
});

describe("updateNode cache sync", () => {
  beforeEach(() => {
    useGraphStore.setState({ nodesMap: {}, edges: [], suggestedEdges: [] });
    mockQC.getQueryData.mockReset();
    mockQC.setQueryData.mockReset();
  });

  it("mirrors documentContent into the cached nodes row", () => {
    useGraphStore.getState().hydrateGraph([stubNode("a")], []);
    const cachedA = {
      id: "a",
      slug: "a",
      type: "person",
      label: "a",
      subtitle: null,
      description: null,
      documentContent: null,
      properties: {},
    };
    mockQC.getQueryData.mockReturnValue([cachedA]);
    const doc = { type: "doc", content: [] };
    useGraphStore.getState().updateNode("a", { documentContent: doc });
    expect(mockQC.setQueryData).toHaveBeenCalledWith(
      ["graph", "nodes"],
      expect.arrayContaining([expect.objectContaining({ slug: "a", documentContent: doc })]),
    );
  });
});