import { describe, it, expect, vi, beforeEach } from "vitest";
import { type NextRequest } from "next/server";
import { GET } from "@/app/api/notifications/route";
import { PATCH } from "@/app/api/notifications/[id]/route";

const mocks = vi.hoisted(() => ({
  sessionUid: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/graph/session", () => ({ sessionUid: mocks.sessionUid }));
vi.mock("@/lib/graph/db", () => ({
  db: {
    select: mocks.select,
    update: mocks.update,
  },
}));

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/notifications", () => {
  it("returns 401 when not logged in", async () => {
    mocks.sessionUid.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns notifications and unread count for logged-in user", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    const rows = [
      { id: "n1", type: "submission_approved", message: "Approved", read: false, createdAt: new Date(), metadata: null },
      { id: "n2", type: "submission_rejected", message: "Rejected", read: true, createdAt: new Date(), metadata: null },
    ];
    mocks.select.mockReturnValueOnce({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: () => rows,
          }),
        }),
      }),
    });
    mocks.select.mockReturnValueOnce({
      from: () => ({
        where: () => [{ value: 1 }],
      }),
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notifications).toHaveLength(2);
    expect(body.unreadCount).toBe(1);
  });

  it("returns empty notifications and zero unread count when user has none", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    mocks.select.mockReturnValueOnce({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: () => [],
          }),
        }),
      }),
    });
    mocks.select.mockReturnValueOnce({
      from: () => ({
        where: () => [{ value: 0 }],
      }),
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notifications).toHaveLength(0);
    expect(body.unreadCount).toBe(0);
  });
});

describe("PATCH /api/notifications/[id]", () => {
  it("returns 401 when not logged in", async () => {
    mocks.sessionUid.mockResolvedValue(null);
    const req = { json: async () => ({}) } as unknown as NextRequest;
    const res = await PATCH(req, { params: Promise.resolve({ id: "n1" }) });
    expect(res.status).toBe(401);
  });

  it("marks notification as read", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    mocks.update.mockReturnValue({
      set: () => ({
        where: () => ({ returning: () => [{ id: "n1" }] }),
      }),
    });
    const req = { json: async () => ({}) } as unknown as NextRequest;
    const res = await PATCH(req, { params: Promise.resolve({ id: "n1" }) });
    expect(res.status).toBe(200);
  });

  it("returns 404 when notification does not exist or belongs to another user", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    mocks.update.mockReturnValue({
      set: () => ({
        where: () => ({ returning: () => [] }),
      }),
    });
    const req = { json: async () => ({}) } as unknown as NextRequest;
    const res = await PATCH(req, { params: Promise.resolve({ id: "n1" }) });
    expect(res.status).toBe(404);
  });
});
