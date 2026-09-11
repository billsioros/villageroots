import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/admin/users/route";

const mocks = vi.hoisted(() => ({
  sessionUid: vi.fn(),
  isAdminUid: vi.fn(),
  createAdminClient: vi.fn(),
  listUsers: vi.fn(),
  updateUserById: vi.fn(),
  getRoleForUser: vi.fn(),
  countAdmins: vi.fn(),
  setRoleForUser: vi.fn(),
  logAudit: vi.fn(),
}));

vi.mock("@/lib/graph/session", () => ({ sessionUid: mocks.sessionUid }));
vi.mock("@/lib/graph/admin", () => ({ isAdminUid: mocks.isAdminUid }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock("@/lib/graph/rbac", () => ({
  getRoleForUser: mocks.getRoleForUser,
  countAdmins: mocks.countAdmins,
  setRoleForUser: mocks.setRoleForUser,
  isRole: (v: unknown) => v === "admin" || v === "contributor",
}));
vi.mock("@/lib/graph/audit", () => ({ logAudit: mocks.logAudit }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.createAdminClient.mockReturnValue({
    auth: {
      admin: { listUsers: mocks.listUsers, updateUserById: mocks.updateUserById },
    },
  } as never);
  mocks.listUsers.mockResolvedValue({
    data: {
      users: [{ id: "u1", email: "ana@potidaneia.gr", user_metadata: { name: "Eleni", surname: "Katsari" } }],
    },
    error: null,
  } as never);
  mocks.getRoleForUser.mockResolvedValue("contributor");
  mocks.countAdmins.mockResolvedValue(1 as never);
  mocks.setRoleForUser.mockResolvedValue(undefined as never);
  mocks.logAudit.mockResolvedValue(undefined as never);
});

describe("GET /api/admin/users", () => {
  it("returns 401 when unauthenticated", async () => {
    mocks.sessionUid.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 404 when not an admin", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    mocks.isAdminUid.mockResolvedValue(false);
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it("returns empty users when the service role key is missing", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    mocks.isAdminUid.mockResolvedValue(true);
    mocks.createAdminClient.mockReturnValue(null as never);
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.users).toEqual([]);
  });

  it("returns 500 when listUsers fails", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    mocks.isAdminUid.mockResolvedValue(true);
    mocks.listUsers.mockResolvedValue({ data: { users: [] }, error: { message: "db error" } } as never);
    const res = await GET();
    expect(res.status).toBe(500);
  });

  it("maps name and surname from user_metadata", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    mocks.isAdminUid.mockResolvedValue(true);
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.users[0]).toMatchObject({
      id: "u1",
      name: "Eleni",
      surname: "Katsari",
    });
    expect(body.users[0].full_name).toBeUndefined();
  });

  it("returns null name and surname when user_metadata is missing", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    mocks.isAdminUid.mockResolvedValue(true);
    mocks.listUsers.mockResolvedValue({
      data: { users: [{ id: "u2", email: "x@y.example", user_metadata: null }] },
      error: null,
    } as never);
    const res = await GET();
    const body = await res.json();
    expect(body.users[0]).toMatchObject({ id: "u2", name: null, surname: null });
  });

  it("normalises a missing role row to contributor", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    mocks.isAdminUid.mockResolvedValue(true);
    mocks.getRoleForUser.mockResolvedValue(null as never);
    const res = await GET();
    const body = await res.json();
    expect(body.users[0].role).toBe("contributor");
  });
});

describe("POST /api/admin/users", () => {
  function req(body: unknown) {
    return { json: async () => body } as unknown as Request;
  }

  it("returns 401 when unauthenticated", async () => {
    mocks.sessionUid.mockResolvedValue(null);
    const res = await POST(req({ userId: "u1", name: "Eleni", surname: "Katsari" }));
    expect(res.status).toBe(401);
  });

  it("returns 404 when not an admin", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    mocks.isAdminUid.mockResolvedValue(false);
    const res = await POST(req({ userId: "u1", name: "Eleni", surname: "Katsari" }));
    expect(res.status).toBe(404);
  });

  it("returns 400 when userId is missing", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    mocks.isAdminUid.mockResolvedValue(true);
    const res = await POST(req({ name: "Eleni", surname: "Katsari" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when name or surname is missing for an edit", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    mocks.isAdminUid.mockResolvedValue(true);
    const res = await POST(req({ userId: "u1", name: "Eleni" }));
    expect(res.status).toBe(400);
  });

  it("updates a user's name and surname via user_metadata", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    mocks.isAdminUid.mockResolvedValue(true);
    mocks.updateUserById.mockResolvedValue({ data: { user: { id: "u1" } }, error: null } as never);
    const res = await POST(req({ userId: "u1", name: "Eleni", surname: "Katsari" }));
    expect(mocks.updateUserById).toHaveBeenCalledWith("u1", {
      user_metadata: { name: "Eleni", surname: "Katsari" },
    });
    expect(res.status).toBe(200);
  });

  it("trims whitespace from name and surname", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    mocks.isAdminUid.mockResolvedValue(true);
    mocks.updateUserById.mockResolvedValue({ data: { user: { id: "u1" } }, error: null } as never);
    await POST(req({ userId: "u1", name: "  Eleni  ", surname: "  Katsari  " }));
    expect(mocks.updateUserById).toHaveBeenCalledWith("u1", {
      user_metadata: { name: "Eleni", surname: "Katsari" },
    });
  });

  it("returns 500 when the update fails", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    mocks.isAdminUid.mockResolvedValue(true);
    mocks.updateUserById.mockResolvedValue({ data: { user: null }, error: { message: "boom" } } as never);
    const res = await POST(req({ userId: "u1", name: "Eleni", surname: "Katsari" }));
    expect(res.status).toBe(500);
  });

  it("returns 400 when role is not a valid role", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    mocks.isAdminUid.mockResolvedValue(true);
    const res = await POST(req({ userId: "u1", role: "superadmin" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when the request contains no operation", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    mocks.isAdminUid.mockResolvedValue(true);
    const res = await POST(req({ userId: "u1" }));
    expect(res.status).toBe(400);
  });

  it("applies a combined name and role update in one request", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    mocks.isAdminUid.mockResolvedValue(true);
    mocks.updateUserById.mockResolvedValue({ data: { user: { id: "u2" } }, error: null } as never);
    const res = await POST(
      req({ userId: "u2", name: "Maria", surname: "Katsari", role: "admin", email: "u2@example.com" }),
    );
    expect(res.status).toBe(200);
    expect(mocks.updateUserById).toHaveBeenCalledWith("u2", {
      user_metadata: { name: "Maria", surname: "Katsari" },
    });
    expect(mocks.setRoleForUser).toHaveBeenCalledWith("u2", "admin");
    expect(mocks.logAudit).toHaveBeenCalledWith("role_change", "user", "u2@example.com", {
      roleBefore: "contributor",
      roleAfter: "admin",
    });
  });

  it("rejects a combined update that demotes yourself before any write", async () => {
    mocks.sessionUid.mockResolvedValue("self");
    mocks.isAdminUid.mockResolvedValue(true);
    const res = await POST(req({ userId: "self", name: "X", surname: "Y", role: "contributor" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/own role/i);
    expect(mocks.updateUserById).not.toHaveBeenCalled();
    expect(mocks.setRoleForUser).not.toHaveBeenCalled();
  });

  it("applies a combined name and deactivation in one request", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    mocks.isAdminUid.mockResolvedValue(true);
    mocks.updateUserById.mockResolvedValue({ data: { user: { id: "u2" } }, error: null } as never);
    const res = await POST(req({ userId: "u2", name: "Maria", surname: "Katsari", isActive: false }));
    expect(res.status).toBe(200);
    expect(mocks.updateUserById).toHaveBeenCalledTimes(2);
    expect(mocks.updateUserById).toHaveBeenCalledWith("u2", {
      user_metadata: { name: "Maria", surname: "Katsari" },
    });
    expect(mocks.updateUserById).toHaveBeenCalledWith("u2", { ban_duration: "876000h" });
  });

  it("returns 400 when an admin tries to change their own role", async () => {
    mocks.sessionUid.mockResolvedValue("self");
    mocks.isAdminUid.mockResolvedValue(true);
    const res = await POST(req({ userId: "self", role: "contributor" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/own role/i);
  });

  it("returns 400 when demoting the last admin", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    mocks.isAdminUid.mockResolvedValue(true);
    mocks.getRoleForUser.mockResolvedValue("admin");
    mocks.countAdmins.mockResolvedValue(1);
    const res = await POST(req({ userId: "u1", role: "contributor" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/last admin/i);
    expect(mocks.setRoleForUser).not.toHaveBeenCalled();
  });

  it("promotes a contributor to admin and records an audit entry", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    mocks.isAdminUid.mockResolvedValue(true);
    mocks.getRoleForUser.mockResolvedValue("contributor");
    const res = await POST(req({ userId: "u2", role: "admin", email: "u2@example.com" }));
    expect(res.status).toBe(200);
    expect(mocks.setRoleForUser).toHaveBeenCalledWith("u2", "admin");
    expect(mocks.logAudit).toHaveBeenCalledWith(
      "role_change",
      "user",
      "u2@example.com",
      { roleBefore: "contributor", roleAfter: "admin" },
    );
  });

  it("demotes an admin to contributor when another admin remains", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    mocks.isAdminUid.mockResolvedValue(true);
    mocks.getRoleForUser.mockResolvedValue("admin");
    mocks.countAdmins.mockResolvedValue(2);
    const res = await POST(req({ userId: "u2", role: "contributor", email: "u2@example.com" }));
    expect(res.status).toBe(200);
    expect(mocks.setRoleForUser).toHaveBeenCalledWith("u2", "contributor");
    expect(mocks.logAudit).toHaveBeenCalledWith(
      "role_change",
      "user",
      "u2@example.com",
      { roleBefore: "admin", roleAfter: "contributor" },
    );
  });

  it("returns 400 when an admin deactivates their own account", async () => {
    mocks.sessionUid.mockResolvedValue("self");
    mocks.isAdminUid.mockResolvedValue(true);
    const res = await POST(req({ userId: "self", isActive: false }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/own account/i);
    expect(mocks.updateUserById).not.toHaveBeenCalled();
  });

  it("allows an admin to reactivate their own account", async () => {
    mocks.sessionUid.mockResolvedValue("self");
    mocks.isAdminUid.mockResolvedValue(true);
    mocks.updateUserById.mockResolvedValue({ data: { user: { id: "self" } }, error: null } as never);
    const res = await POST(req({ userId: "self", isActive: true }));
    expect(res.status).toBe(200);
    expect(mocks.updateUserById).toHaveBeenCalledWith("self", { ban_duration: "none" });
  });

  it("is a no-op (200) when the role is already the requested one", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    mocks.isAdminUid.mockResolvedValue(true);
    mocks.getRoleForUser.mockResolvedValue("admin");
    const res = await POST(req({ userId: "u2", role: "admin" }));
    expect(res.status).toBe(200);
    expect(mocks.setRoleForUser).not.toHaveBeenCalled();
    expect(mocks.logAudit).not.toHaveBeenCalled();
  });
});