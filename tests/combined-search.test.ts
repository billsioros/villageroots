import { describe, it, expect, vi, beforeEach } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import { edges } from "@/drizzle/schema";
import { matchNodesByVector, fetchOneHopNeighbors, fetchNodeBodies } from "@/lib/graph/combined-search";

const mocks = vi.hoisted(() => ({
  dbExecute: vi.fn(),
  dbSelect: vi.fn(),
}));

vi.mock("@/lib/graph/db", () => ({
  db: { execute: mocks.dbExecute, select: mocks.dbSelect },
}));

beforeEach(() => {
  mocks.dbExecute.mockClear();
  mocks.dbSelect.mockClear();
});

const vector = Array(1024).fill(0.1);

describe("matchNodesByVector", () => {
  const sqlText = (arg: unknown): string =>
    (arg as { queryChunks: { value?: unknown }[] }).queryChunks
      .map((c) => (c && typeof c === "object" && c.value !== undefined ? String(c.value) : ""))
      .join("");
  const sqlValues = (arg: unknown): unknown[] =>
    (arg as { queryChunks: unknown[] }).queryChunks.filter((c: unknown) => c === null || typeof c !== "object");

  it("joins nodes to normalize matches to canvas (slug) ids", async () => {
    mocks.dbExecute.mockResolvedValue([
      { node_id: "uuid-1", node_slug: "yiannis", label: "Yiannis", node_type: "person", similarity: 0.9, content_hash: "h" },
    ]);
    const out = await matchNodesByVector(vector);
    expect(out[0].slug).toBe("yiannis");
    expect(out[0].nodeId).toBe("yiannis");
    const sqlArg = mocks.dbExecute.mock.calls[0][0] as unknown;
    expect(sqlText(sqlArg)).toContain("JOIN public.nodes");
  });

  it("passes the query vector with defaults", async () => {
    mocks.dbExecute.mockResolvedValue([]);
    await matchNodesByVector(vector);
    const sqlArg = mocks.dbExecute.mock.calls[0][0] as unknown;
    expect(sqlText(sqlArg)).toContain("match_nodes");
  });

  it("passes threshold and filter type through", async () => {
    mocks.dbExecute.mockResolvedValue([]);
    await matchNodesByVector(vector, { matchCount: 3, threshold: 0.5, filterType: "landmark" });
    const sqlArg = mocks.dbExecute.mock.calls[0][0] as unknown;
    expect(sqlValues(sqlArg)).toEqual(expect.arrayContaining([3, 0.5, "landmark"]));
  });
});

describe("fetchOneHopNeighbors", () => {
  let capturedWhere: unknown;

  const edgeSelect = {
    from: () => ({
      innerJoin: () => ({
        innerJoin: () => ({
          where: (whereArg: unknown) => {
            capturedWhere = whereArg;
            return {
              limit: async () => [
                {
                  edgeId: "e-uuid",
                  edgeSlug: "edge-1",
                  sourceId: "src-uuid",
                  sourceSlug: "yiannis",
                  targetId: "tgt-uuid",
                  targetSlug: "marika",
                  verb: "related_to",
                  sourceLabel: "Yiannis",
                  sourceType: "person",
                  targetLabel: "Marika",
                  targetType: "person",
                },
              ],
            };
          },
        }),
      }),
    }),
  };
  it("returns neighbor rows keyed by canvas (slug) ids", async () => {
    mocks.dbSelect.mockReturnValueOnce(edgeSelect);
    const out = await fetchOneHopNeighbors(["yiannis"]);
    expect(out[0].edgeId).toBe("edge-1");
    expect(out[0].sourceId).toBe("yiannis");
    expect(out[0].targetId).toBe("marika");
    expect(out[0].neighborLabel).toBe("Marika");
    expect(out[0].verb).toBe("related_to");
    expect(out[0].neighborType).toBe("person");
  });

  it("resolves the neighbor label from the edge endpoints, not the wanted set", async () => {
    // Regression: neighbors map was keyed by the wanted ids and probed with
    // the neighbor id — it always missed, so neighborLabel came back "".
    mocks.dbSelect.mockReturnValueOnce(edgeSelect);
    const out = await fetchOneHopNeighbors(["yiannis"]);
    expect(out[0].neighborLabel).toBe("Marika");
  });

  it("filters edges by source or target in the node list using parametrized inArray, not a raw array literal", async () => {
    mocks.dbSelect.mockReturnValueOnce(edgeSelect);
    await fetchOneHopNeighbors(["yiannis", "marika"]);

    const realDb = drizzle({ connection: { host: "x", port: 1, user: "x", password: "x", database: "x" } });
    const generated = (realDb.select().from(edges).where(capturedWhere as never).toSQL()).sql;
    expect(generated).toContain("in (");
    expect(generated).not.toContain("::uuid[]");
    expect(generated).not.toContain("ANY(");
  });
});

describe("fetchNodeBodies", () => {
  const bodySelect = {
    from: () => ({
      where: () => ({
        then: async (cb: (rows: unknown[]) => unknown) =>
          cb([
            {
              id: "uuid-1",
              slug: "n1",
              description: "Second-generation miller.",
              documentContent: {
                type: "doc",
                content: [
                  { type: "heading", content: [{ type: "text", text: "Test information" }] },
                ],
              },
            },
            { id: "uuid-2", slug: "n2", description: null, documentContent: null },
          ]),
      }),
    }),
  };

  it("builds plain text from description and rich text content", async () => {
    mocks.dbSelect.mockReturnValueOnce(bodySelect);
    const out = await fetchNodeBodies(["n1", "n2"]);
    expect(out.n1).toContain("Second-generation miller.");
    expect(out.n1).toContain("Test information");
    expect(out.n2).toBeUndefined();
  });

  it("queries and keys bodies by slug (the id the pipeline now passes)", async () => {
    const slugSelect = {
      from: () => ({
        where: () => ({
          then: async (cb: (rows: unknown[]) => unknown) =>
            cb([
              { id: "uuid-1", slug: "yiannis", description: "Miller.", documentContent: null },
            ]),
        }),
      }),
    };
    mocks.dbSelect.mockReturnValueOnce(slugSelect);
    const out = await fetchNodeBodies(["yiannis"]);
    expect(out.yiannis).toBe("Miller.");
    expect(out["uuid-1"]).toBeUndefined();
  });

  it("returns an empty map when no ids are given", async () => {
    await expect(fetchNodeBodies([])).resolves.toEqual({});
  });
});
