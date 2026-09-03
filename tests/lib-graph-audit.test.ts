import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockValues, mockDb, mockSessionUid } = vi.hoisted(() => {
  const mockValues = vi.fn().mockResolvedValue(undefined);
  const mockDb = { insert: vi.fn().mockReturnValue({ values: mockValues }) };
  const mockSessionUid = vi.fn().mockResolvedValue("test-user-id");
  return { mockValues, mockDb, mockSessionUid };
});

vi.mock("@/lib/graph/session", () => ({
  sessionUid: mockSessionUid,
}));

vi.mock("@/lib/graph/db", () => ({
  db: mockDb,
}));

describe("logAudit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionUid.mockResolvedValue("test-user-id");
    mockDb.insert.mockReturnValue({ values: mockValues });
  });

  it("logs a node creation audit entry", async () => {
    const { logAudit } = await import("@/lib/graph/audit");

    await logAudit("create", "node", "test-slug", { label: "Test Node" });

    expect(mockDb.insert).toHaveBeenCalledWith(expect.anything());
    expect(mockValues).toHaveBeenCalledWith({
      actorId: "test-user-id",
      entityType: "node",
      entityId: "test-slug",
      entitySlug: "test-slug",
      action: "create",
      statusBefore: undefined,
      statusAfter: undefined,
      metadata: { label: "Test Node" },
    });
  });

  it("logs a status change with before/after", async () => {
    const { logAudit } = await import("@/lib/graph/audit");

    await logAudit("status_change", "node", "my-node", {
      statusBefore: "pending",
      statusAfter: "approved",
    });

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        statusBefore: "pending",
        statusAfter: "approved",
      })
    );
  });

  it("swallows errors and never throws", async () => {
    mockValues.mockRejectedValueOnce(new Error("DB down"));

    const { logAudit } = await import("@/lib/graph/audit");

    await expect(
      logAudit("create", "node", "x", {})
    ).resolves.toBeUndefined();
  });

  it("accepts a provided transaction object", async () => {
    const mockTx = {
      insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
    };

    const { logAudit } = await import("@/lib/graph/audit");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await logAudit("create", "node", "x", {}, mockTx as any);

    expect(mockTx.insert).toHaveBeenCalled();
    expect(mockDb.insert).not.toHaveBeenCalled();
  });
});
