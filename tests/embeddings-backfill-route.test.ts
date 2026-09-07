import { describe, it, expect, vi } from "vitest";
import { type NextRequest } from "next/server";
import { POST } from "@/app/api/admin/embeddings/backfill/route";

const mocks = vi.hoisted(() => ({
  sessionUid: vi.fn(),
  isAdminUid: vi.fn(),
  runBackfill: vi.fn(),
}));

vi.mock("@/lib/graph/session", () => ({ sessionUid: mocks.sessionUid }));
vi.mock("@/lib/graph/admin", () => ({ isAdminUid: mocks.isAdminUid }));
vi.mock("@/lib/graph/backfill", () => ({ runBackfill: mocks.runBackfill }));

const BASE = "http://localhost:3000";
const mreq = (path = "/api/admin/embeddings/backfill") => ({ nextUrl: new URL(path, BASE) }) as unknown as NextRequest;

describe("POST /api/admin/embeddings/backfill", () => {
  it("returns 401 when not signed in", async () => {
    mocks.sessionUid.mockResolvedValue(null);
    const res = await POST(mreq());
    expect(res.status).toBe(401);
  });
  it("returns 404 for non-admin", async () => {
    mocks.sessionUid.mockResolvedValue("u");
    mocks.isAdminUid.mockResolvedValue(false);
    const res = await POST(mreq());
    expect(res.status).toBe(404);
  });
  it("runs the backfill and returns totals for an admin", async () => {
    mocks.sessionUid.mockResolvedValue("admin");
    mocks.isAdminUid.mockResolvedValue(true);
    mocks.runBackfill.mockResolvedValue({ total: 42, processed: 40, failed: 2 });
    const res = await POST(mreq());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ total: 42, processed: 40, failed: 2 });
  });
  it("passes batchSize and delayMs through from query params", async () => {
    mocks.sessionUid.mockResolvedValue("admin");
    mocks.isAdminUid.mockResolvedValue(true);
    mocks.runBackfill.mockResolvedValue({ total: 0, processed: 0, failed: 0 });
    await POST(mreq("/api/admin/embeddings/backfill?batchSize=5&delayMs=0"));
    expect(mocks.runBackfill).toHaveBeenCalledWith(
      expect.objectContaining({ batchSize: 5, delayMs: 0 }),
    );
  });
});
