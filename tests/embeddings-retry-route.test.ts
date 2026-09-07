import { describe, it, expect, vi } from "vitest";
import { type NextRequest } from "next/server";
import { POST } from "@/app/api/admin/embeddings/retry/route";

const mocks = vi.hoisted(() => ({
  sessionUid: vi.fn(),
  isAdminUid: vi.fn(),
  runRetry: vi.fn(),
}));

vi.mock("@/lib/graph/session", () => ({ sessionUid: mocks.sessionUid }));
vi.mock("@/lib/graph/admin", () => ({ isAdminUid: mocks.isAdminUid }));
vi.mock("@/lib/graph/retry-failed", () => ({ runRetry: mocks.runRetry }));

const BASE = "http://localhost:3000";
const mreq = () => ({ nextUrl: new URL("/api/admin/embeddings/retry", BASE) }) as unknown as NextRequest;

describe("POST /api/admin/embeddings/retry", () => {
  it("returns 401 when not signed in", async () => {
    mocks.sessionUid.mockResolvedValue(null);
    expect((await POST(mreq())).status).toBe(401);
  });
  it("returns 404 for non-admin", async () => {
    mocks.sessionUid.mockResolvedValue("u");
    mocks.isAdminUid.mockResolvedValue(false);
    expect((await POST(mreq())).status).toBe(404);
  });
  it("re-ingests failed embeddings and returns tallies", async () => {
    mocks.sessionUid.mockResolvedValue("admin");
    mocks.isAdminUid.mockResolvedValue(true);
    mocks.runRetry.mockResolvedValue({ total: 3, succeeded: 1, failed: 2 });
    const res = await POST(mreq());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ total: 3, succeeded: 1, failed: 2 });
  });
});
