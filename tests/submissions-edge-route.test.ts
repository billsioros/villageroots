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
const SOURCE_SLUG = "source-slug";
const TARGET_SLUG = "target-slug";
const SOURCE_ID = "11111111-1111-4111-8111-111111111111";
const TARGET_ID = "22222222-2222-4222-8222-222222222222";
const payload = () => ({
  sourceId: SOURCE_SLUG,
  targetId: TARGET_SLUG,
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
    mocks.limit.mockResolvedValueOnce([{ id: SOURCE_ID }]).mockResolvedValueOnce([{ id: TARGET_ID }]);
    mocks.limit.mockResolvedValue([]);
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.sessionUid.mockResolvedValue(null);
    const res = await POST(mreq(payload()));
    expect(res.status).toBe(401);
  });

  it("returns 400 when sourceId is missing", async () => {
    const res = await POST(mreq({ targetId: TARGET_SLUG, verb: "married_to" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when targetId is missing", async () => {
    const res = await POST(mreq({ sourceId: SOURCE_SLUG, verb: "married_to" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when verb is missing", async () => {
    const res = await POST(mreq({ sourceId: SOURCE_SLUG, targetId: TARGET_SLUG }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid verb", async () => {
    const res = await POST(mreq({ sourceId: SOURCE_SLUG, targetId: TARGET_SLUG, verb: "invalid_verb" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for a self-loop", async () => {
    const res = await POST(mreq({ sourceId: SOURCE_SLUG, targetId: SOURCE_SLUG, verb: "married_to" }));
    expect(res.status).toBe(400);
  });

  it("resolves source and target slugs to UUIDs and rejects a self-loop on resolution", async () => {
    mocks.limit.mockReset();
    mocks.limit.mockResolvedValueOnce([{ id: SOURCE_ID }]).mockResolvedValueOnce([{ id: SOURCE_ID }]);
    const res = await POST(mreq({ sourceId: SOURCE_SLUG, targetId: TARGET_SLUG, verb: "married_to" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when source node does not exist", async () => {
    mocks.limit.mockReset();
    mocks.limit.mockResolvedValueOnce([]);
    mocks.limit.mockResolvedValueOnce([{ id: TARGET_ID }]);
    const res = await POST(mreq(payload()));
    expect(res.status).toBe(400);
  });

  it("returns 400 when target node does not exist", async () => {
    mocks.limit.mockReset();
    mocks.limit.mockResolvedValueOnce([{ id: SOURCE_ID }]);
    mocks.limit.mockResolvedValueOnce([]);
    const res = await POST(mreq(payload()));
    expect(res.status).toBe(400);
  });

  it("returns 409 for duplicate edge", async () => {
    mocks.limit.mockReset();
    mocks.limit.mockResolvedValueOnce([{ id: SOURCE_ID }]);
    mocks.limit.mockResolvedValueOnce([{ id: TARGET_ID }]);
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
    expect(call.sourceId).toBe(SOURCE_ID);
    expect(call.targetId).toBe(TARGET_ID);
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
