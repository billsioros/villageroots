import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchAllNodes, fetchAllEdges, fetchGraphNodes, MAX_GRAPH_NODES } from "@/lib/graph/api";
import type { NodeRow, EdgeRow } from "@/drizzle/schema";

function row(id: string): NodeRow {
  return {
    id, slug: id, type: "person", label: id, subtitle: "", description: "",
    documentContent: null,
    properties: {}, status: "approved", privacy: "public", createdBy: "u1",
    createdAt: new Date(), updatedAt: new Date(),
  };
}

function edgeRow(id: string): EdgeRow {
  return {
    id, slug: id, sourceId: `s-${id}`, targetId: `t-${id}`,
    sourceSlug: `src-${id}`, targetSlug: `tgt-${id}`,
    type: "married_to", properties: {}, status: "approved", createdBy: "u1",
    createdAt: new Date(), updatedAt: new Date(),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchAllNodes", () => {
  it("steps through pages until a short page is returned", async () => {
    const calls: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      calls.push(String(url));
      const limit = 500;
      const offset = Number(String(url).split("offset=")[1] ?? 0);
      if (offset >= 1000) return new Response(JSON.stringify([]));
      return new Response(JSON.stringify(Array.from({ length: limit }, (_, i) => row(`n-${offset + i}`))));
    });

    const all = await fetchAllNodes();
    expect(all).toHaveLength(1000);
    expect(calls.length).toBe(3);
  });

  it("caps at MAX_GRAPH_NODES", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify(Array.from({ length: 500 }, (_, i) => row(`n-${i}`)))),
    );
    const all = await fetchAllNodes();
    expect(all).toHaveLength(MAX_GRAPH_NODES);
    expect(vi.mocked(fetch).mock.calls.length).toBe(4);
  });
});

describe("fetchAllEdges", () => {
  it("steps through pages until a short page is returned", async () => {
    const calls: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      calls.push(String(url));
      const limit = 500;
      const offset = Number(String(url).split("offset=")[1] ?? 0);
      if (offset >= 1000) return new Response(JSON.stringify([]));
      return new Response(JSON.stringify(Array.from({ length: limit }, (_, i) => edgeRow(`e-${offset + i}`))));
    });

    const all = await fetchAllEdges();
    expect(all).toHaveLength(1000);
    expect(calls.length).toBe(3);
  });
});

describe("fetchGraphNodes error handling", () => {
  it("throws with the status on a non-ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("nope", { status: 500 }));
    await expect(fetchGraphNodes()).rejects.toThrow("Failed to load nodes (500)");
  });
});
