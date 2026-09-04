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
  dbInsert: vi.fn(),
}));

vi.mock("@/lib/graph/session", () => ({ sessionUid: mocks.sessionUid }));
vi.mock("@/lib/graph/admin", () => ({ isAdminUid: mocks.isAdminUid }));
vi.mock("@/lib/graph/db", () => ({
  db: {
    transaction: mocks.transaction,
    update: mocks.update,
    select: mocks.select,
    insert: mocks.dbInsert,
  },
}));

const mreq = (body: unknown) => ({ json: async () => body }) as unknown as NextRequest;
const cparams = (type: string, id: string) => ({ params: Promise.resolve({ type, id }) }) as unknown as { params: Promise<{ type: string; id: string }> };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.select.mockReturnValue({
    from: () => ({
      where: () => ({ limit: async () => [{ status: "pending", createdBy: "user-1" }] }),
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
    const txSelect = vi.fn().mockReturnValue({
      from: () => ({ where: () => ({ limit: async () => [{ createdBy: "admin" }] }) }),
    });
    mocks.transaction.mockImplementation(async (fn) => fn({
      update: () => ({ set: () => ({ where: () => ({ returning: async () => [{ status: "approved" }] }) }) }),
      insert: () => ({ values: () => ({ returning: async () => [{ id: "m1" }] }) }),
      select: txSelect,
    }));
    const res = await POST(mreq({ action: "approve" }), cparams("nodes", "n1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("approved");
    expect(mocks.transaction).toHaveBeenCalled();
  });

  it("skips the status UPDATE when already approved but still records a moderation history row", async () => {
    mocks.sessionUid.mockResolvedValue("admin");
    mocks.isAdminUid.mockResolvedValue(true);
    mocks.select.mockReturnValue({
      from: () => ({
        where: () => ({ limit: async () => [{ status: "approved", createdBy: "admin" }] }),
      }),
    });
    const update = vi.fn().mockReturnValue({
      set: () => ({ where: () => ({}) }),
    });
    const insert = vi.fn().mockReturnValue({
      values: () => ({ returning: async () => [{ id: "m2" }] }),
    });
    const txSelect = vi.fn().mockReturnValue({
      from: () => ({ where: () => ({ limit: async () => [{ createdBy: "admin" }] }) }),
    });
    mocks.transaction.mockImplementation(async (fn) => fn({ update, insert, select: txSelect }));
    const res = await POST(mreq({ action: "approve" }), cparams("nodes", "n1"));
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("approved");
    expect(update).not.toHaveBeenCalled();
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it("creates a notification for the submitter on approve", async () => {
    mocks.sessionUid.mockResolvedValue("admin");
    mocks.isAdminUid.mockResolvedValue(true);
    // Mock select to return a node with status pending
    mocks.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: async () => [{ status: "pending", createdBy: "user-1" }],
        }),
      }),
    });
    const values = vi.fn().mockReturnValue({ returning: async () => [{ id: "n1" }] });
    const insert = vi.fn().mockReturnValue({ values });
    const update = vi.fn().mockReturnValue({
      set: () => ({ where: () => ({}) }),
    });
    mocks.dbInsert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
    // Transaction mock must include select for the createdBy lookup
    const txSelect = vi.fn().mockReturnValue({
      from: () => ({
        where: () => ({
          limit: async () => [{ createdBy: "user-1" }],
        }),
      }),
    });
    mocks.transaction.mockImplementation(async (fn) => fn({ update, insert, select: txSelect }));
    const res = await POST(mreq({ action: "approve" }), cparams("nodes", "n1"));
    expect(res.status).toBe(200);
    // insert called twice in the tx: moderations + notifications (audit runs after commit)
    expect(insert).toHaveBeenCalledTimes(2);
    // standalone audit insert runs after the transaction
    expect(mocks.dbInsert).toHaveBeenCalledTimes(1);
    // Assert notification content
    expect(values).toHaveBeenCalledWith(expect.objectContaining({
      userId: "user-1",
      type: "submission_approved",
      message: "Your submission was approved and is now live on the graph",
    }));
  });
});
