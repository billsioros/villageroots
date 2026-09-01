import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const insert = vi.fn();
  const insertValues = vi.fn();
  const transaction = vi.fn();
  const select = vi.fn();
  const from = vi.fn();
  const where = vi.fn();
  insert.mockReturnValue({ values: insertValues });
  insertValues.mockReturnValue({ returning: async () => [{ id: "node-1" }] });
  transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn({ insert }));
  select.mockReturnValue({ from });
  from.mockReturnValue({ where });
  where.mockImplementation(async () => [{ id: "n-9", slug: "kato-potamia" }]);
  return { insert, insertValues, transaction, select, from, where, sessionUid: vi.fn(), isAdminUid: vi.fn() };
});
vi.mock("@/lib/graph/db", () => ({ db: { insert: mocks.insert, transaction: mocks.transaction, select: mocks.select } }));
vi.mock("@/lib/graph/session", () => ({ sessionUid: mocks.sessionUid }));
vi.mock("@/lib/graph/admin", () => ({ isAdminUid: mocks.isAdminUid }));

import { POST } from "@/app/api/submissions/route";

const mreq = (body: unknown) => ({ json: async () => body }) as Request;
const payload = () => ({
  nodes: [
    { id: "draft-a", type: "person", label: "Yiayia", facts: { born: "1924" }, deceased: true, x: 1, y: 2 },
    { id: "draft-b", type: "family", label: "Tsalikis" },
  ],
  edges: [{ source: "draft-a", target: "draft-b", verb: "child_of" }],
});

describe("POST /api/submissions", () => {
  beforeEach(() => {
    mocks.sessionUid.mockReset();
    mocks.isAdminUid.mockReset();
    mocks.insert.mockClear();
    mocks.insertValues.mockClear();
    mocks.transaction.mockClear();
    mocks.where.mockClear();
    mocks.where.mockImplementation(async () => [{ id: "n-9", slug: "kato-potamia" }]);
    mocks.sessionUid.mockResolvedValue("u-1");
    mocks.isAdminUid.mockResolvedValue(false);
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.sessionUid.mockResolvedValue(null);
    const res = await POST(mreq(payload()));
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid JSON", async () => {
    const res = await POST({ json: async () => { throw new Error("bad") } } as unknown as Request);
    expect(res.status).toBe(400);
  });

  it("returns 400 when nodes is empty", async () => {
    const res = await POST(mreq({ nodes: [], edges: [] }));
    expect(res.status).toBe(400);
  });

  it("creates a pending batch for a non-admin and returns 201", async () => {
    const res = await POST(mreq(payload()));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ nodes: 2, edges: 1 });
    // 2 node inserts + 1 edge insert + 1 admin notification insert
    expect(mocks.insert).toHaveBeenCalledTimes(4);
    const nodeCall = mocks.insertValues.mock.calls[0][0];
    expect(nodeCall.status).toBe("pending");
    expect(nodeCall.privacy).toBe("public"); // deceased person
    expect(nodeCall.createdBy).toBe("u-1");
    expect(nodeCall.slug).toMatch(/^yiayia-/);
    expect(nodeCall.properties).toMatchObject({ facts: { born: "1924" }, deceased: true, x: 1, y: 2 });
    const edgeCall = mocks.insertValues.mock.calls[2][0];
    expect(edgeCall.sourceId).toBe("node-1");
    expect(edgeCall.targetId).toBe("node-1");
    expect(edgeCall.type).toBe("child_of");
    expect(edgeCall.status).toBe("pending");
  });

  it("creates an approved batch for an admin (bypasses review)", async () => {
    mocks.isAdminUid.mockResolvedValue(true);
    const res = await POST(mreq(payload()));
    expect(res.status).toBe(201);
    expect(mocks.insertValues.mock.calls[0][0].status).toBe("approved");
    expect(mocks.insertValues.mock.calls[2][0].status).toBe("approved");
  });

  it("resolves existing approved slugs to node ids", async () => {
    const res = await POST(
      mreq({ nodes: [{ id: "draft-a", type: "person", label: "Nikos" }], edges: [{ source: "draft-a", target: "kato-potamia", verb: "lived_at" }] }),
    );
    expect(res.status).toBe(201);
    const edgeCall = mocks.insertValues.mock.calls[1][0];
    expect(edgeCall.sourceId).toBe("node-1");
    expect(edgeCall.targetId).toBe("n-9");
  });

  it("returns 400 for an unknown referenced slug", async () => {
    mocks.where.mockImplementation(async () => []);
    const res = await POST(
      mreq({ nodes: [{ id: "draft-a", type: "person", label: "Nikos" }], edges: [{ source: "draft-a", target: "nope", verb: "lived_at" }] }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for a self-loop draft edge", async () => {
    const res = await POST(
      mreq({ nodes: [{ id: "draft-a", type: "person", label: "Nikos" }], edges: [{ source: "draft-a", target: "draft-a", verb: "related_to" }] }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for duplicate edges", async () => {
    const res = await POST(
      mreq({
        nodes: [
          { id: "draft-a", type: "person", label: "A" },
          { id: "draft-b", type: "person", label: "B" },
        ],
        edges: [
          { source: "draft-a", target: "draft-b", verb: "related_to" },
          { source: "draft-a", target: "draft-b", verb: "related_to" },
        ],
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when a label exceeds the field cap", async () => {
    const res = await POST(mreq({ nodes: [{ id: "d", type: "person", label: "x".repeat(201) }], edges: [] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when documentContent exceeds 1MB", async () => {
    const hugeDoc = { text: "x".repeat(1_000_001) };
    const res = await POST(
      mreq({
        nodes: [{ id: "draft-a", type: "person", label: "A", documentContent: hugeDoc }],
        edges: [],
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "documentContent too large" });
  });

  it("persists documentContent when provided in submission", async () => {
    const doc = { type: "doc", content: [] };
    const res = await POST(
      mreq({
        nodes: [{ id: "draft-a", type: "person", label: "A", documentContent: doc }],
        edges: [],
      }),
    );
    expect(res.status).toBe(201);
    const nodeCall = mocks.insertValues.mock.calls[0][0];
    expect(nodeCall.documentContent).toEqual(doc);
  });
});
