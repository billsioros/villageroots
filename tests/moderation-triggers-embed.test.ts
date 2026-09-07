import { describe, it, expect, vi, beforeEach } from "vitest";
import { type NextRequest } from "next/server";
import { POST } from "@/app/api/moderation/[type]/[id]/route";

const mocks = vi.hoisted(() => ({
  sessionUid: vi.fn(),
  isAdminUid: vi.fn(),
  transaction: vi.fn(),
  select: vi.fn(),
  ingestEmbedding: vi.fn(),
}));

vi.mock("@/lib/graph/session", () => ({ sessionUid: mocks.sessionUid }));
vi.mock("@/lib/graph/admin", () => ({ isAdminUid: mocks.isAdminUid }));
vi.mock("@/lib/graph/db", () => ({
  db: {
    transaction: mocks.transaction,
    select: mocks.select,
    update: () => ({ set: () => ({ where: () => ({ returning: async () => [] }) }) }),
    insert: () => ({ values: () => ({ returning: async () => [{ id: "m" }] }) }),
  },
}));
vi.mock("@/lib/graph/ingest", () => ({ ingestEmbedding: mocks.ingestEmbedding }));

const mreq = (body: unknown) => ({ json: async () => body }) as unknown as NextRequest;
const cparams = (type: string, id: string) =>
  ({ params: Promise.resolve({ type, id }) }) as unknown as { params: Promise<{ type: string; id: string }> };

const adminSession = () => {
  mocks.sessionUid.mockResolvedValue("admin");
  mocks.isAdminUid.mockResolvedValue(true);
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.ingestEmbedding.mockResolvedValue({ status: "embedded" });
});

describe("moderation triggers embedding on node approval", () => {
  it("calls ingestEmbedding once when a node is newly approved", async () => {
    adminSession();
    mocks.select.mockReturnValue({
      from: () => ({ where: () => ({ limit: async () => [{ status: "pending", createdBy: "admin" }] }) }),
    });
    mocks.transaction.mockImplementation(async (fn) =>
      fn({
        update: () => ({ set: () => ({ where: () => ({ returning: async () => [{ status: "approved" }] }) }) }),
        insert: () => ({ values: () => ({ returning: async () => [{ id: "m1" }] }) }),
        select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ createdBy: "admin" }] }) }) }),
      }),
    );
    const res = await POST(mreq({ action: "approve" }), cparams("nodes", "n1"));
    expect(res.status).toBe(200);
    expect(mocks.ingestEmbedding).toHaveBeenCalledTimes(1);
    expect(mocks.ingestEmbedding).toHaveBeenCalledWith("n1");
  });

  it("does not call ingestEmbedding when status did not change (already approved)", async () => {
    adminSession();
    mocks.select.mockReturnValue({
      from: () => ({ where: () => ({ limit: async () => [{ status: "approved", createdBy: "admin" }] }) }),
    });
    mocks.transaction.mockImplementation(async (fn) =>
      fn({
        update: () => ({ set: () => ({ where: () => ({ returning: async () => [] }) }) }),
        insert: () => ({ values: () => ({ returning: async () => [{ id: "m1" }] }) }),
        select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ createdBy: "admin" }] }) }) }),
      }),
    );
    const res = await POST(mreq({ action: "approve" }), cparams("nodes", "n1"));
    expect(res.status).toBe(200);
    expect(mocks.ingestEmbedding).not.toHaveBeenCalled();
  });

  it("does not call ingestEmbedding for edge approvals", async () => {
    adminSession();
    mocks.select.mockReturnValue({
      from: () => ({ where: () => ({ limit: async () => [{ status: "pending", createdBy: "admin" }] }) }),
    });
    mocks.transaction.mockImplementation(async (fn) =>
      fn({
        update: () => ({ set: () => ({ where: () => ({ returning: async () => [{ status: "approved" }] }) }) }),
        insert: () => ({ values: () => ({ returning: async () => [{ id: "m1" }] }) }),
        select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ createdBy: "admin" }] }) }) }),
      }),
    );
    const res = await POST(mreq({ action: "approve" }), cparams("edges", "e1"));
    expect(res.status).toBe(200);
    expect(mocks.ingestEmbedding).not.toHaveBeenCalled();
  });

  it("returns moderation result even if ingestion throws (non-blocking)", async () => {
    adminSession();
    mocks.ingestEmbedding.mockRejectedValue(new Error("boom"));
    mocks.select.mockReturnValue({
      from: () => ({ where: () => ({ limit: async () => [{ status: "pending", createdBy: "admin" }] }) }),
    });
    mocks.transaction.mockImplementation(async (fn) =>
      fn({
        update: () => ({ set: () => ({ where: () => ({ returning: async () => [{ status: "approved" }] }) }) }),
        insert: () => ({ values: () => ({ returning: async () => [{ id: "m1" }] }) }),
        select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ createdBy: "admin" }] }) }) }),
      }),
    );
    const res = await POST(mreq({ action: "approve" }), cparams("nodes", "n1"));
    expect(res.status).toBe(200);
  });
});
