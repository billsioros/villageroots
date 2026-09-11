import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/admin/invite/route";

const mocks = vi.hoisted(() => ({
  sessionUid: vi.fn(),
  isAdminUid: vi.fn(),
  createAdminClient: vi.fn(),
  inviteUserByEmail: vi.fn(),
  listUsers: vi.fn(),
  updateUserById: vi.fn(),
  setRoleForUser: vi.fn(),
}));

vi.mock("@/lib/graph/session", () => ({ sessionUid: mocks.sessionUid }));
vi.mock("@/lib/graph/admin", () => ({ isAdminUid: mocks.isAdminUid }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock("@/lib/graph/rbac", () => ({
  setRoleForUser: mocks.setRoleForUser,
  isRole: (v: unknown) => v === "admin" || v === "contributor",
}));

function inviteRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/invite", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.sessionUid.mockResolvedValue("admin-1");
  mocks.isAdminUid.mockResolvedValue(true);
  mocks.createAdminClient.mockReturnValue({
    auth: {
      admin: {
        inviteUserByEmail: mocks.inviteUserByEmail,
        listUsers: mocks.listUsers,
        updateUserById: mocks.updateUserById,
      },
    },
  } as never);
  mocks.inviteUserByEmail.mockResolvedValue({ error: null } as never);
  mocks.listUsers.mockResolvedValue({
    data: { users: [{ id: "new-id", email: "maria@example.com" }] },
    error: null,
  } as never);
  mocks.updateUserById.mockResolvedValue({ data: { user: { id: "new-id" } }, error: null } as never);
  mocks.setRoleForUser.mockResolvedValue(undefined as never);
});

describe("POST /api/admin/invite", () => {
  it("assigns the requested role when role is provided", async () => {
    const res = await POST(
      inviteRequest({ email: "maria@example.com", name: "Maria", surname: "Papas", role: "admin" }),
    );
    expect(res.status).toBe(200);
    expect(mocks.setRoleForUser).toHaveBeenCalledWith("new-id", "admin");
  });

  it("defaults to contributor when role is omitted", async () => {
    const res = await POST(
      inviteRequest({ email: "maria@example.com", name: "Maria", surname: "Papas" }),
    );
    expect(res.status).toBe(200);
    expect(mocks.setRoleForUser).toHaveBeenCalledWith("new-id", "contributor");
  });

  it("defaults to contributor for an invalid role value", async () => {
    const res = await POST(
      inviteRequest({ email: "maria@example.com", name: "Maria", surname: "Papas", role: "owner" }),
    );
    expect(res.status).toBe(200);
    expect(mocks.setRoleForUser).toHaveBeenCalledWith("new-id", "contributor");
  });
});
