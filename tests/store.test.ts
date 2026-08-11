import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GraphNode, GraphEdge } from "@/lib/graph/types";

vi.mock("@/lib/graph/query-client", () => {
  const queryClient = {
    getQueryData: vi.fn(),
    setQueryData: vi.fn(),
  };
  return { queryClient };
});

import { useGraphStore, selectAllNodes, selectNodeById, selectVisibleNodes } from "@/store/graphStore";
import { queryClient } from "@/lib/graph/query-client";

const mockQueryClient = vi.mocked(queryClient);

function node(id: string, x = 0, y = 0): GraphNode {
  return {
    id,
    type: "person",
    label: id,
    subtitle: "",
    description: "",
    color: "#e15a72",
    mark: "P",
    x,
    y,
  };
}

function edge(id: string, source: string, target: string): GraphEdge {
  return { id, source, target, verb: "related_to", kind: "social" };
}

beforeEach(() => {
  useGraphStore.setState({ nodesMap: {}, edges: [], suggestedEdges: [] });
  mockQueryClient.getQueryData.mockReset();
  mockQueryClient.setQueryData.mockReset();
  mockQueryClient.getQueryData.mockReturnValue([]);
});

describe("hydrateGraph", () => {
  it("builds a map keyed by id, carrying over existing x/y", () => {
    useGraphStore.setState({ nodesMap: { a: node("a", 5, 5) } });
    useGraphStore.getState().hydrateGraph([node("a", 99, 99), node("b", 1, 2)], []);
    const map = useGraphStore.getState().nodesMap;
    expect(map.a.x).toBe(5);
    expect(map.a.y).toBe(5);
    expect(map.b.x).toBe(1);
    expect(map.b.y).toBe(2);
    expect(map.a.type).toBe("person");
  });
});

describe("node actions", () => {
  it("adds a node to the store and mirrors it into the react-query cache", () => {
    useGraphStore.getState().addNode(node("n1", 10, 20));
    expect(selectAllNodes(useGraphStore.getState())).toHaveLength(1);
    expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
      ["graph", "nodes"],
      [expect.objectContaining({ slug: "n1" })],
    );
  });

  it("updates a node in store and cache", () => {
    useGraphStore.setState({ nodesMap: { n1: node("n1") } });
    mockQueryClient.getQueryData.mockReturnValue([{ slug: "n1" }]);
    useGraphStore.getState().updateNode("n1", { label: "Renamed" });
    expect(useGraphStore.getState().nodesMap.n1.label).toBe("Renamed");
    const update = mockQueryClient.setQueryData.mock.calls.find((c) => c[0][1] === "nodes");
    expect(update?.[1]).toEqual([{ slug: "n1", label: "Renamed" }]);
  });

  it("removes a node and its incident edges from store and cache", () => {
    useGraphStore.setState({
      nodesMap: { a: node("a"), b: node("b") },
      edges: [edge("e1", "a", "b"), edge("e2", "b", "c")],
    });
    mockQueryClient.getQueryData.mockImplementation((key) =>
      key[1] === "edges"
        ? [
            { slug: "e1", sourceSlug: "a", targetSlug: "b" },
            { slug: "e3", sourceSlug: "x", targetSlug: "y" },
          ]
        : [{ slug: "a" }, { slug: "b" }],
    );
    useGraphStore.getState().removeNode("a");
    expect(useGraphStore.getState().nodesMap.a).toBeUndefined();
    expect(useGraphStore.getState().edges).toEqual([edge("e2", "b", "c")]);
    const nodesUpdate = mockQueryClient.setQueryData.mock.calls.find((c) => c[0][1] === "nodes");
    expect(nodesUpdate?.[1]).toEqual([{ slug: "b" }]);
    const edgesUpdate = mockQueryClient.setQueryData.mock.calls.find((c) => c[0][1] === "edges");
    expect(edgesUpdate?.[1]).toEqual([{ slug: "e3", sourceSlug: "x", targetSlug: "y" }]);
  });

  it("routes x/y into the cache row's properties on update", () => {
    useGraphStore.setState({ nodesMap: { n1: node("n1", 1, 1) } });
    mockQueryClient.getQueryData.mockReturnValue([{ slug: "n1", properties: { x: 1, y: 1 } }]);
    useGraphStore.getState().updateNode("n1", { x: 30, y: 40, label: "Renamed" });
    const update = mockQueryClient.setQueryData.mock.calls.find((c) => c[0][1] === "nodes");
    expect(update?.[1]).toEqual([{ slug: "n1", label: "Renamed", properties: { x: 30, y: 40 } }]);
  });

  it("skips the cache mirror when the nodes cache is empty", () => {
    mockQueryClient.getQueryData.mockReturnValue(undefined);
    useGraphStore.getState().addNode(node("n1"));
    expect(mockQueryClient.setQueryData).not.toHaveBeenCalled();
  });

  it("skips the cache mirror when the edges cache is empty", () => {
    mockQueryClient.getQueryData.mockReturnValue(undefined);
    useGraphStore.getState().addEdge(edge("e1", "a", "b"));
    expect(mockQueryClient.setQueryData).not.toHaveBeenCalled();
  });

  it("selectNodeById returns null for unknown ids", () => {
    useGraphStore.setState({ nodesMap: { a: node("a") } });
    expect(selectNodeById(useGraphStore.getState(), "a")?.id).toBe("a");
    expect(selectNodeById(useGraphStore.getState(), "zzz")).toBeNull();
    expect(selectNodeById(useGraphStore.getState(), null)).toBeNull();
  });
});

describe("edge actions", () => {
  it("adds an edge to the store and mirrors it into the cache", () => {
    useGraphStore.getState().addEdge(edge("e1", "a", "b"));
    expect(useGraphStore.getState().edges).toHaveLength(1);
    expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
      ["graph", "edges"],
      [expect.objectContaining({ slug: "e1", sourceSlug: "a", targetSlug: "b" })],
    );
  });

  it("updates an edge in store and cache", () => {
    useGraphStore.setState({ edges: [edge("e1", "a", "b")] });
    mockQueryClient.getQueryData.mockReturnValue([{ slug: "e1" }]);
    useGraphStore.getState().updateEdge("e1", { verb: "married_to", kind: "social" });
    expect(useGraphStore.getState().edges[0].verb).toBe("married_to");
    const update = mockQueryClient.setQueryData.mock.calls.find((c) => c[0][1] === "edges");
    expect(update?.[1]).toEqual([{ slug: "e1", verb: "married_to", kind: "social" }]);
  });

  it("removes an edge from store and cache", () => {
    useGraphStore.setState({ edges: [edge("e1", "a", "b")] });
    mockQueryClient.getQueryData.mockReturnValue([{ slug: "e1" }]);
    useGraphStore.getState().removeEdge("e1");
    expect(useGraphStore.getState().edges).toHaveLength(0);
    const update = mockQueryClient.setQueryData.mock.calls.find((c) => c[0][1] === "edges");
    expect(update?.[1]).toEqual([]);
  });
});

describe("canvas position actions", () => {
  it("setNodePosition updates the store only", () => {
    useGraphStore.setState({ nodesMap: { a: node("a", 1, 1) } });
    useGraphStore.getState().setNodePosition("a", 42, 43);
    expect(useGraphStore.getState().nodesMap.a.x).toBe(42);
    expect(useGraphStore.getState().nodesMap.a.y).toBe(43);
    expect(mockQueryClient.setQueryData).not.toHaveBeenCalled();
  });

  it("pinNode writes position into the cache row's properties", () => {
    useGraphStore.setState({ nodesMap: { a: node("a", 1, 1) } });
    mockQueryClient.getQueryData.mockReturnValue([{ slug: "a", properties: { x: 1, y: 1 } }]);
    useGraphStore.getState().pinNode("a", { x: 50, y: 60 });
    const update = mockQueryClient.setQueryData.mock.calls.find((c) => c[0][1] === "nodes");
    expect(update?.[1]).toEqual([{ slug: "a", properties: { x: 50, y: 60 } }]);
  });
});

describe("selectVisibleNodes", () => {
  it("excludes hidden-type nodes and re-includes the same reference after toggle", () => {
    useGraphStore.setState({ nodesMap: { a: node("a"), b: node("b") } });
    useGraphStore.getState().toggleType("person");
    const hidden = selectVisibleNodes(useGraphStore.getState());
    expect(hidden).toHaveLength(0);
    useGraphStore.getState().toggleType("person");
    const visible = selectVisibleNodes(useGraphStore.getState());
    expect(visible.map((n) => n.id)).toEqual(["a", "b"]);
    expect(visible[0]).toBe(useGraphStore.getState().nodesMap.a);
  });
});

