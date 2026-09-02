import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const insert = vi.fn();
  const insertValues = vi.fn();
  const select = vi.fn();
  const from = vi.fn();
  const where = vi.fn();
  const limit = vi.fn();
  const mkWhereResult = () => Object.assign(Promise.resolve([]), { limit });
  insert.mockReturnValue({ values: insertValues });
  insertValues.mockReturnValue({ returning: async () => [{ id: "edge-new" }] });
  select.mockReturnValue({ from });
  from.mockReturnValue({ where });
  where.mockImplementation(() => mkWhereResult());
  limit.mockResolvedValue([]);
  return { insert, insertValues, select, from, where, limit, sessionUid: vi.fn(), isAdminUid: vi.fn() };
});

vi.mock("@/lib/graph/db", () => ({ db: { insert: mocks.insert, select: mocks.select } }));
vi.mock("@/lib/graph/session", () => ({ sessionUid: mocks.sessionUid }));
vi.mock("@/lib/graph/admin", () => ({ isAdminUid: mocks.isAdminUid }));

import { POST } from "@/app/api/submissions/edge/route";

const mreq = (body: unknown) => ({ json: async () => body }) as Request;
const payload = () => ({
  sourceId: "uuid-source",
  targetId: "uuid-target",
  verb: "married_to",
});

describe("POST /api/submissions/edge", () => {
  beforeEach(() => {
    mocks.sessionUid.mockReset();
    mocks.isAdminUid.mockReset();
    mocks.insert.mockClear();
    mocks.insertValues.mockClear();
    mocks.select.mockClear();
    mocks.from.mockClear();
    mocks.where.mockClear();
    mocks.limit.mockClear();
    mocks.sessionUid.mockResolvedValue("u-1");
    mocks.isAdminUid.mockResolvedValue(false);
    mocks.limit.mockResolvedValueOnce([{ id: "uuid-source" }]).mockResolvedValueOnce([{ id: "uuid-target" }]);
    mocks.limit.mockResolvedValue([]);
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.sessionUid.mockResolvedValue(null);
    const res = await POST(mreq(payload()));
    expect(res.status).toBe(401);
  });

  it("returns 400 when sourceId is missing", async () => {
    const res = await POST(mreq({ targetId: "uuid-target", verb: "married_to" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when targetId is missing", async () => {
    const res = await POST(mreq({ sourceId: "uuid-source", verb: "married_to" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when verb is missing", async () => {
    const res = await POST(mreq({ sourceId: "uuid-source", targetId: "uuid-target" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid verb", async () => {
    const res = await POST(mreq({ sourceId: "uuid-source", targetId: "uuid-target", verb: "invalid_verb" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for a self-loop", async () => {
    const res = await POST(mreq({ sourceId: "uuid-a", targetId: "uuid-a", verb: "married_to" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when source node does not exist", async () => {
    mocks.limit.mockReset();
    mocks.limit.mockResolvedValueOnce([]);
    mocks.limit.mockResolvedValueOnce([{ id: "uuid-target" }]);
    const res = await POST(mreq(payload()));
    expect(res.status).toBe(400);
  });

  it("returns 400 when target node does not exist", async () => {
    mocks.limit.mockReset();
    mocks.limit.mockResolvedValueOnce([{ id: "uuid-source" }]);
    mocks.limit.mockResolvedValueOnce([]);
    const res = await POST(mreq(payload()));
    expect(res.status).toBe(400);
  });

  it("returns 409 for duplicate edge", async () => {
    mocks.limit.mockReset();
    mocks.limit.mockResolvedValueOnce([{ id: "uuid-source" }]);
    mocks.limit.mockResolvedValueOnce([{ id: "uuid-target" }]);
    mocks.limit.mockResolvedValueOnce([{ id: "edge-existing" }]);
    const res = await POST(mreq(payload()));
    expect(res.status).toBe(409);
  });

  it("creates a pending edge for a non-admin and returns 201", async () => {
    const res = await POST(mreq(payload()));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.status).toBe("pending");
    expect(body.id).toBe("edge-new");
    expect(mocks.insertValues).toHaveBeenCalledTimes(1);
    const call = mocks.insertValues.mock.calls[0][0];
    expect(call.sourceId).toBe("uuid-source");
    expect(call.targetId).toBe("uuid-target");
    expect(call.type).toBe("married_to");
    expect(call.status).toBe("pending");
    expect(call.createdBy).toBe("u-1");
  });

  it("creates an approved edge for an admin", async () => {
    mocks.isAdminUid.mockResolvedValue(true);
    const res = await POST(mreq(payload()));
    expect(res.status).toBe(201);
    const call = mocks.insertValues.mock.calls[0][0];
    expect(call.status).toBe("approved");
  });
});
