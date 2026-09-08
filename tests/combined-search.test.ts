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

  it("passes the query vector with defaults", async () => {
    mocks.dbExecute.mockResolvedValue([
      { node_id: "n1", label: "Yiannis", node_type: "person", similarity: 0.9, content_hash: "h" },
    ]);
    const out = await matchNodesByVector(vector);
    expect(out[0].nodeId).toBe("n1");
    expect(out[0].nodeType).toBe("person");
    expect(mocks.dbExecute).toHaveBeenCalled();
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
        where: (whereArg: unknown) => {
          capturedWhere = whereArg;
          return {
            limit: async () => [
              {
                edgeId: "e1",
                sourceId: "n1",
                targetId: "n2",
                verb: "related_to",
                sourceLabel: null,
                sourceType: null,
              },
            ],
          };
        },
      }),
    }),
  };
  const nodeSelect = {
    from: () => ({
      where: () => ({
        then: async (cb: (rows: unknown[]) => unknown) =>
          cb([{ id: "n2", label: "Marika", type: "person" }]),
      }),
    }),
  };

  it("returns neighbor rows for a set of node ids", async () => {
    mocks.dbSelect.mockReturnValueOnce(edgeSelect);
    mocks.dbSelect.mockReturnValueOnce(nodeSelect);
    const out = await fetchOneHopNeighbors(["n1"]);
    expect(out[0].neighborLabel).toBe("Marika");
    expect(out[0].verb).toBe("related_to");
    expect(out[0].neighborType).toBe("person");
  });

  it("filters edges by source or target in the node list using parametrized inArray, not a raw array literal", async () => {
    mocks.dbSelect.mockReturnValueOnce(edgeSelect);
    mocks.dbSelect.mockReturnValueOnce(nodeSelect);
    await fetchOneHopNeighbors(["n1", "n2"]);

    const realDb = drizzle({ connection: { host: "x", port: 1, user: "x", password: "x", database: "x" } });
    const generated = (realDb.select().from(edges).where(capturedWhere as never).toSQL()).sql;
    expect(generated).toContain("in (");
    expect(generated).toContain("$2, $3");
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
              id: "n1",
              description: "Second-generation miller.",
              documentContent: {
                type: "doc",
                content: [
                  { type: "heading", content: [{ type: "text", text: "Test information" }] },
                ],
              },
            },
            { id: "n2", description: null, documentContent: null },
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

  it("returns an empty map when no ids are given", async () => {
    await expect(fetchNodeBodies([])).resolves.toEqual({});
  });
});
