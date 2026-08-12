import { describe, it, expect, vi, beforeEach } from "vitest";
import { type NextRequest } from "next/server";
import { GET } from "@/app/api/admin/review/history/route";

const mocks = vi.hoisted(() => ({
  sessionUid: vi.fn(),
  isAdminUid: vi.fn(),
  dbSelect: vi.fn(),
}));

vi.mock("@/lib/graph/session", () => ({ sessionUid: mocks.sessionUid }));
vi.mock("@/lib/graph/admin", () => ({ isAdminUid: mocks.isAdminUid }));
vi.mock("@/lib/graph/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({ orderBy: () => mocks.dbSelect() }),
      }),
    }),
  },
}));

const REQ = (t: string, id: string) =>
  ({ nextUrl: { searchParams: new URLSearchParams({ type: t, id }) } }) as unknown as NextRequest;

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/admin/review/history", () => {
  it("returns 404 for non-admin", async () => {
    mocks.sessionUid.mockResolvedValue("u");
    mocks.isAdminUid.mockResolvedValue(false);
    const res = await GET(REQ("nodes", "n1"));
    expect(res.status).toBe(404);
  });

  it("returns moderation history for admin", async () => {
    mocks.sessionUid.mockResolvedValue("admin");
    mocks.isAdminUid.mockResolvedValue(true);
    mocks.dbSelect.mockResolvedValue([{ id: "m1", action: "approved" }]);
    const res = await GET(REQ("nodes", "n1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].id).toBe("m1");
  });
});