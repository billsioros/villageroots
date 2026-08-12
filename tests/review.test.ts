import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchNodeReview } from "@/lib/admin/review";

const mocks = vi.hoisted(() => ({
  rows: [] as unknown[],
  countResult: [{ value: 3 }],
  count: vi.fn(),
}));

vi.mock("@/lib/graph/db", () => ({
  db: {
    select: (cols?: Record<string, unknown>) => {
      const isCount = !!cols && Object.keys(cols).length === 1 && "value" in cols;
      return {
        from: () =>
          isCount
            ? mocks.countResult
            : {
                innerJoin: () => ({
                  where: () => ({ orderBy: () => mocks.rows }),
                }),
              },
      };
    },
    count: mocks.count,
  },
}));

beforeEach(() => {
  mocks.rows = [];
  mocks.countResult = [{ value: 3 }];
});

describe("fetchNodeReview", () => {
  it("maps a pending person node to an item", async () => {
    mocks.rows = [
      {
        id: "n1",
        type: "person",
        label: "A",
        subtitle: "",
        description: "d",
        status: "pending",
        properties: { x: 1 },
        createdAt: new Date(),
        submitterId: "e@x",
      },
    ];
    const out = await fetchNodeReview();
    expect(out.items).toHaveLength(1);
    expect(out.items[0].submitter).toBe("e@x");
    expect(out.items[0].kind).toBe("node");
    expect(out.counts.nodes).toBe(3);
  });

  it("masks a living person node with generic label", async () => {
    mocks.rows = [
      {
        id: "n2",
        type: "person",
        label: "Real Name",
        subtitle: "s",
        description: "bio",
        status: "pending",
        properties: { deceased: false, x: 1, y: 2 },
        createdAt: new Date(),
        submitterId: "e@x",
      },
    ];
    const out = await fetchNodeReview();
    expect(out.items[0].title).toBe("Living Person");
    expect(out.items[0].properties).toEqual({ x: 1, y: 2 });
    expect(out.items[0].body).toBe("");
  });
});
