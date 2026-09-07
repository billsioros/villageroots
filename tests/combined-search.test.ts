import { describe, it, expect, vi, beforeEach } from "vitest";
import { matchNodesByVector, fetchOneHopNeighbors } from "@/lib/graph/combined-search";

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
  it("returns neighbor rows for a set of node ids", async () => {
    const edgeSelect = {
      from: () => ({
        innerJoin: () => ({
          where: () => ({
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
          }),
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
    mocks.dbSelect.mockReturnValueOnce(edgeSelect);
    mocks.dbSelect.mockReturnValueOnce(nodeSelect);
    const out = await fetchOneHopNeighbors(["n1"]);
    expect(out[0].neighborLabel).toBe("Marika");
    expect(out[0].verb).toBe("related_to");
    expect(out[0].neighborType).toBe("person");
  });
});
