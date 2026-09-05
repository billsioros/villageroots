import { describe, it, expect, vi, beforeEach } from "vitest";
import { type NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  sessionUid: vi.fn(),
  isAdminUid: vi.fn(),
  select: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  rows: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/lib/graph/session", () => ({ sessionUid: mocks.sessionUid }));
vi.mock("@/lib/graph/admin", () => ({ isAdminUid: mocks.isAdminUid }));
vi.mock("@/lib/graph/db", () => ({ db: { select: mocks.select } }));

import { GET } from "@/app/api/graph/search/route";

const mreq = (q: string | null, limit?: string): NextRequest => {
  const url = new URL("http://localhost/api/graph/search");
  if (q !== null) url.searchParams.set("q", q);
  if (limit !== undefined) url.searchParams.set("limit", limit);
  return { url: url.toString() } as unknown as NextRequest;
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.rows = [];
  mocks.limit.mockResolvedValue(mocks.rows);
  mocks.orderBy.mockReturnValue({ limit: mocks.limit });
  mocks.where.mockReturnValue({ orderBy: mocks.orderBy });
  mocks.select.mockReturnValue({ from: () => ({ where: mocks.where }) });
  mocks.sessionUid.mockResolvedValue("user-1");
  mocks.isAdminUid.mockResolvedValue(false);
});

describe("GET /api/graph/search — validation & limits", () => {
  it("returns 400 for a query shorter than 2 characters", async () => {
    const res = await GET(mreq("a"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Query must be at least 2 characters" });
  });

  it("returns 400 for an empty/whitespace-only query", async () => {
    const res = await GET(mreq("   "));
    expect(res.status).toBe(400);
  });

  it("clamps the limit to 1..20 with a default of 8", async () => {
    await GET(mreq("mill"));
    expect(mocks.limit).toHaveBeenLastCalledWith(8);

    await GET(mreq("mill", "999"));
    expect(mocks.limit).toHaveBeenLastCalledWith(20);

    await GET(mreq("mill", "0"));
    expect(mocks.limit).toHaveBeenLastCalledWith(1);
  });

  it("does not call the db when the query is too short", async () => {
    await GET(mreq("a"));
    expect(mocks.select).not.toHaveBeenCalled();
  });
});
