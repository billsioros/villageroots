import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/admin/users/route";

const mocks = vi.hoisted(() => ({
  sessionUid: vi.fn(),
  isAdminUid: vi.fn(),
  createAdminClient: vi.fn(),
  listUsers: vi.fn(),
  updateUserById: vi.fn(),
  getRoleForUser: vi.fn(),
}));

vi.mock("@/lib/graph/session", () => ({ sessionUid: mocks.sessionUid }));
vi.mock("@/lib/graph/admin", () => ({ isAdminUid: mocks.isAdminUid }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock("@/lib/graph/rbac", () => ({ getRoleForUser: mocks.getRoleForUser }));

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
});