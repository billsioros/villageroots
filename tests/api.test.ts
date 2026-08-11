import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchAllNodes, MAX_GRAPH_NODES } from "@/lib/graph/api";
import type { NodeRow } from "@/drizzle/schema";

function row(id: string): NodeRow {
  return {
    id, slug: id, type: "person", label: id, subtitle: "", description: "",
    properties: {}, status: "approved", privacy: "public", createdBy: "u1",
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
    expect(all.length).toBeLessThanOrEqual(MAX_GRAPH_NODES);
  });
});
