import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildEdgeSubtitle, fetchNodeReview, fetchEdgeReview } from "@/lib/admin/review";

const mocks = vi.hoisted(() => ({
  rows: [] as unknown[],
  count: vi.fn(),
}));

vi.mock("@/lib/graph/db", () => {
  const chain = () => ({
    innerJoin: () => chain(),
    where: () => ({ orderBy: () => mocks.rows }),
  });
  return {
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
              : chain(),
        };
      },
      count: mocks.count,
    },
  };
});

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

  it("shows a living person node's name in the review queue", async () => {
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
    expect(out.items[0].title).toBe("Real Name");
    expect(out.items[0].subtitle).toBe("s");
    expect(out.items[0].body).toBe("bio");
    expect(out.items[0].properties).toEqual({ deceased: false, x: 1, y: 2 });
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

describe("buildEdgeSubtitle", () => {
  it("produces a readable connected-node label", () => {
    expect(buildEdgeSubtitle("Anna", "married_to", "Petros")).toBe("Anna — married_to — Petros");
  });

  it("uses node display labels, not draft slugs", () => {
    expect(buildEdgeSubtitle("Test Notification 3", "related_to", "Test Notification 5")).toBe(
      "Test Notification 3 — related_to — Test Notification 5",
    );
  });
});

describe("fetchEdgeReview", () => {
  it("maps a pending edge with connected-node labels and no empty body", async () => {
    mocks.rows = [
      {
        id: "e1",
        type: "related_to",
        status: "pending",
        properties: {},
        sourceLabel: "Test Notification 3",
        targetLabel: "Test Notification 5",
        createdAt: new Date(),
        email: "e@x",
      },
    ];
    const out = await fetchEdgeReview();
    expect(out.items).toHaveLength(1);
    expect(out.items[0].kind).toBe("edge");
    expect(out.items[0].title).toBe("related_to");
    expect(out.items[0].subtitle).toBe("Test Notification 3 — related_to — Test Notification 5");
    expect(out.items[0].body).toBe("");
    expect(out.items[0].submitter).toBe("e@x");
    expect(out.counts.edges).toBe(1);
  });

  it("keeps non-empty edge properties in the body", async () => {
    mocks.rows = [
      {
        id: "e1",
        type: "related_to",
        status: "pending",
        properties: { note: "shared history" },
        sourceLabel: "A",
        targetLabel: "B",
        createdAt: new Date(),
        email: "e@x",
      },
    ];
    const out = await fetchEdgeReview();
    expect(out.items[0].body).toBe('{"note":"shared history"}');
  });
});
