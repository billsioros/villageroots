import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/me/submissions/route";

const mocks = vi.hoisted(() => ({
  sessionUid: vi.fn(),
  dbSelect: vi.fn(),
  dbModeration: vi.fn(),
}));

vi.mock("@/lib/graph/session", () => ({ sessionUid: mocks.sessionUid }));
vi.mock("@/lib/graph/db", () => {
  type Chain = Promise<unknown> & { limit: () => unknown };
  return {
    db: {
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: () => {
              const chain = Promise.resolve(mocks.dbSelect()) as Chain;
              chain.limit = () => mocks.dbModeration();
              return chain;
            },
          }),
        }),
      }),
    },
  };
});

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/me/submissions", () => {
  it("returns 401 for anonymous user", async () => {
    mocks.sessionUid.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the user's submissions for an authenticated user", async () => {
    mocks.sessionUid.mockResolvedValue("u1");
    mocks.dbSelect.mockResolvedValue([
      { id: "n1", slug: "n1", label: "X", status: "pending", privacy: "public", createdAt: new Date() },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  it("attaches the latest moderation reason to rejected submissions", async () => {
    mocks.sessionUid.mockResolvedValue("u1");
    mocks.dbSelect.mockResolvedValue([
      { id: "n1", slug: "n1", label: "X", status: "rejected", privacy: "public", createdAt: new Date() },
    ]);
    mocks.dbModeration.mockResolvedValue([{ reason: "duplicate" }]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].status).toBe("rejected");
    expect(body[0].reason).toBe("duplicate");
  });

  it("sets reason to null when a rejected submission has no moderation row", async () => {
    mocks.sessionUid.mockResolvedValue("u1");
    mocks.dbSelect.mockResolvedValue([
      { id: "n2", slug: "n2", label: "Y", status: "rejected", privacy: "public", createdAt: new Date() },
    ]);
    mocks.dbModeration.mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].reason).toBeNull();
  });
});
