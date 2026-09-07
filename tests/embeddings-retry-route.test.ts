import { describe, it, expect, vi } from "vitest";
import { POST } from "@/app/api/admin/embeddings/retry/route";

const mocks = vi.hoisted(() => ({
  sessionUid: vi.fn(),
  isAdminUid: vi.fn(),
  runRetry: vi.fn(),
}));

vi.mock("@/lib/graph/session", () => ({ sessionUid: mocks.sessionUid }));
vi.mock("@/lib/graph/admin", () => ({ isAdminUid: mocks.isAdminUid }));
vi.mock("@/lib/graph/retry-failed", () => ({ runRetry: mocks.runRetry }));

describe("POST /api/admin/embeddings/retry", () => {
  it("returns 401 when not signed in", async () => {
    mocks.sessionUid.mockResolvedValue(null);
    expect((await POST()).status).toBe(401);
  });
  it("returns 404 for non-admin", async () => {
    mocks.sessionUid.mockResolvedValue("u");
    mocks.isAdminUid.mockResolvedValue(false);
    expect((await POST()).status).toBe(404);
  });
  it("re-ingests failed embeddings and returns tallies", async () => {
    mocks.sessionUid.mockResolvedValue("admin");
    mocks.isAdminUid.mockResolvedValue(true);
    mocks.runRetry.mockResolvedValue({ total: 3, succeeded: 1, failed: 2 });
    const res = await POST();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ total: 3, succeeded: 1, failed: 2 });
  });
});
