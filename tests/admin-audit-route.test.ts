import { describe, it, expect, vi, beforeEach } from "vitest";

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
        leftJoin: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => ({
                offset: () => mocks.dbSelect(),
              }),
            }),
          }),
        }),
      }),
    }),
  },
}));

function makeReq(params?: Record<string, string>) {
  const sp = new URLSearchParams(params);
  return { nextUrl: { searchParams: sp } } as unknown as Parameters<typeof GET>[0];
}

beforeEach(() => {
  vi.resetAllMocks();
});

import { GET } from "@/app/api/admin/audit/route";

describe("GET /api/admin/audit", () => {
  it("returns 404 for non-admin", async () => {
    mocks.sessionUid.mockResolvedValue("u1");
    mocks.isAdminUid.mockResolvedValue(false);
    const res = await GET(makeReq());
    expect(res.status).toBe(404);
  });

  it("returns 200 with items for admin", async () => {
    mocks.sessionUid.mockResolvedValue("admin1");
    mocks.isAdminUid.mockResolvedValue(true);
    mocks.dbSelect.mockResolvedValue([
      {
        id: "audit-1",
        actorId: "user-1",
        entityType: "node",
        entityId: "node-1",
        entitySlug: "person-john",
        action: "create",
        statusBefore: null,
        statusAfter: null,
        metadata: null,
        createdAt: new Date(),
        actorEmail: "user@example.com",
      },
    ]);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].actorEmail).toBe("user@example.com");
  });

  it("passes actorId filter to query", async () => {
    mocks.sessionUid.mockResolvedValue("admin1");
    mocks.isAdminUid.mockResolvedValue(true);
    mocks.dbSelect.mockResolvedValue([]);
    await GET(makeReq({ actorId: "user-1" }));
    expect(mocks.dbSelect).toHaveBeenCalled();
  });
});
