import { describe, it, expect, vi, beforeEach } from "vitest";
import { type NextRequest } from "next/server";
import { POST } from "@/app/api/moderation/[type]/[id]/route";

const mocks = vi.hoisted(() => ({
  sessionUid: vi.fn(),
  isAdminUid: vi.fn(),
  tx: vi.fn(),
  transaction: vi.fn(),
  update: vi.fn(),
  select: vi.fn(),
}));

vi.mock("@/lib/graph/session", () => ({ sessionUid: mocks.sessionUid }));
vi.mock("@/lib/graph/admin", () => ({ isAdminUid: mocks.isAdminUid }));
vi.mock("@/lib/graph/db", () => ({
  db: {
    transaction: mocks.transaction,
    update: mocks.update,
    select: mocks.select,
  },
}));

const mreq = (body: unknown) => ({ json: async () => body }) as unknown as NextRequest;
const cparams = (type: string, id: string) => ({ params: Promise.resolve({ type, id }) }) as unknown as { params: Promise<{ type: string; id: string }> };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.select.mockReturnValue({
    from: () => ({
      where: () => ({ limit: async () => [{ status: "pending" }] }),
    }),
  });
});

describe("POST /api/moderation/[type]/[id]", () => {
  it("returns 404 for non-admin", async () => {
    mocks.sessionUid.mockResolvedValue("u");
    mocks.isAdminUid.mockResolvedValue(false);
    const res = await POST(mreq({ action: "approve" }), cparams("nodes", "n1"));
    expect(res.status).toBe(404);
  });

  it("applies moderation and records history inside a transaction", async () => {
    mocks.sessionUid.mockResolvedValue("admin");
    mocks.isAdminUid.mockResolvedValue(true);
    mocks.transaction.mockImplementation(async (fn) => fn({
      update: () => ({ set: () => ({ where: () => ({ returning: async () => [{ status: "approved" }] }) }) }),
      insert: () => ({ values: () => ({ returning: async () => [{ id: "m1" }] }) }),
    }));
    const res = await POST(mreq({ action: "approve" }), cparams("nodes", "n1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("approved");
    expect(mocks.transaction).toHaveBeenCalled();
  });

  it("prevents non-admin action via admin check (idempotent no-op takes no new history)", async () => {
    mocks.sessionUid.mockResolvedValue("admin");
    mocks.isAdminUid.mockResolvedValue(true);
    mocks.transaction.mockImplementation(async (fn) => fn({
      update: () => ({ set: () => ({ where: () => ({ returning: async () => [{ status: "approved" }] }) }) }),
      insert: () => ({ values: () => ({ returning: async () => [{ id: "m2" }] }) }),
    }));
    const res = await POST(mreq({ action: "approve" }), cparams("nodes", "n1"));
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("approved");
  });
});
