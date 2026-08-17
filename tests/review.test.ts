import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchNodeReview } from "@/lib/admin/review";

const mocks = vi.hoisted(() => ({
  rows: [] as unknown[],
  count: vi.fn(),
}));

vi.mock("@/lib/graph/db", () => ({
  db: {
    select: (cols?: Record<string, unknown>) => {
      const isCount = !!cols && Object.keys(cols).length === 1 && "value" in cols;
      return {
        from: () =>
          isCount
            ? {
                where: () => {
                  const pending = (mocks.rows as Array<Record<string, unknown>>).filter(
                    (r) => r.status === "pending",
                  );
                  return [{ value: pending.length }];
                },
              }
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
        email: "e@x",
      },
    ];
    const out = await fetchNodeReview();
    expect(out.items).toHaveLength(1);
    expect(out.items[0].submitter).toBe("e@x");
    expect(out.items[0].kind).toBe("node");
    expect(out.counts.nodes).toBe(1);
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
        email: "e@x",
      },
    ];
    const out = await fetchNodeReview();
    expect(out.items[0].title).toBe("Living Person");
    expect(out.items[0].properties).toEqual({ x: 1, y: 2 });
    expect(out.items[0].body).toBe("");
  });

  it("counts only pending rows, excluding approved/rejected", async () => {
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
        email: "e@x",
      },
      {
        id: "n2",
        type: "person",
        label: "B",
        subtitle: "",
        description: "d",
        status: "pending",
        properties: { x: 1 },
        createdAt: new Date(),
        email: "e@x",
      },
      {
        id: "n3",
        type: "person",
        label: "C",
        subtitle: "",
        description: "d",
        status: "approved",
        properties: { x: 1 },
        createdAt: new Date(),
        email: "e@x",
      },
    ];
    const out = await fetchNodeReview();
    expect(out.counts.nodes).toBe(2);
  });
});
