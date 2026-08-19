import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  sessionUid: vi.fn(),
  getRoleForUser: vi.fn(),
}));
vi.mock("@/lib/graph/session", () => ({ sessionUid: mocks.sessionUid }));
vi.mock("@/lib/graph/rbac", () => ({ getRoleForUser: mocks.getRoleForUser }));

import { GET } from "@/app/api/me/role/route";

describe("GET /api/me/role", () => {
  beforeEach(() => {
    mocks.sessionUid.mockReset();
    mocks.getRoleForUser.mockReset();
  });

  it("returns the admin role", async () => {
    mocks.sessionUid.mockResolvedValue("u-admin");
    mocks.getRoleForUser.mockResolvedValue("admin");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ role: "admin" });
  });

  it("returns the contributor role", async () => {
    mocks.sessionUid.mockResolvedValue("u-contrib");
    mocks.getRoleForUser.mockResolvedValue("contributor");
    const res = await GET();
    expect(await res.json()).toEqual({ role: "contributor" });
  });

  it("returns null when unauthenticated", async () => {
    mocks.sessionUid.mockResolvedValue(null);
    const res = await GET();
    expect(await res.json()).toEqual({ role: null });
  });
});
