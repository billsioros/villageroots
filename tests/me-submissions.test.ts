import { describe, it, expect, vi, beforeEach } from "vitest";
import { type NextRequest } from "next/server";
import { GET } from "@/app/api/me/submissions/route";

const mocks = vi.hoisted(() => ({
  sessionUid: vi.fn(),
  dbSelect: vi.fn(),
}));

vi.mock("@/lib/graph/session", () => ({ sessionUid: mocks.sessionUid }));
vi.mock("@/lib/graph/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({ orderBy: () => mocks.dbSelect() }),
      }),
    }),
  },
}));

const REQ = {} as unknown as NextRequest;

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/me/submissions", () => {
  it("returns 401 for anonymous user", async () => {
    mocks.sessionUid.mockResolvedValue(null);
    const res = await GET(REQ);
    expect(res.status).toBe(401);
  });

  it("returns the user's submissions for an authenticated user", async () => {
    mocks.sessionUid.mockResolvedValue("u1");
    mocks.dbSelect.mockResolvedValue([
      { id: "n1", slug: "n1", label: "X", status: "pending", privacy: "public" },
    ]);
    const res = await GET(REQ);
    expect(res.status).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });
});
