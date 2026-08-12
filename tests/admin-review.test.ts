import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/admin/review/route";

const mocks = vi.hoisted(() => ({
  sessionUid: vi.fn(),
  isAdminUid: vi.fn(),
  dbSelect: vi.fn(),
}));

vi.mock("@/lib/graph/session", () => ({ sessionUid: mocks.sessionUid }));
vi.mock("@/lib/graph/admin", () => ({ isAdminUid: mocks.isAdminUid }));
vi.mock("@/lib/graph/db", () => {
  return { db: { select: () => ({ from: () => ({ where: () => ({ orderBy: () => ({ limit: () => ({ offset: mocks.dbSelect }) }) }) }) }) } };
});

const REQ = (type: string) => ({ nextUrl: { searchParams: new URLSearchParams({ type }) } }) as unknown as Parameters<typeof GET>[0];

beforeEach(() => { vi.resetAllMocks(); });

describe("GET /api/admin/review", () => {
  it("returns 404 for non-admin", async () => {
    mocks.sessionUid.mockResolvedValue("u1");
    mocks.isAdminUid.mockResolvedValue(false);
    const res = await GET(REQ("nodes"));
    expect(res.status).toBe(404);
  });

  it("returns items and pending counts for admin", async () => {
    mocks.sessionUid.mockResolvedValue("admin1");
    mocks.isAdminUid.mockResolvedValue(true);
    mocks.dbSelect.mockResolvedValue([]);
    const res = await GET(REQ("nodes"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toBeDefined();
    expect(body.counts).toBeDefined();
  });
});
