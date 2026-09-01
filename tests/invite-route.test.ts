import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/admin/invite/route";

const mocks = vi.hoisted(() => ({
  sessionUid: vi.fn(),
  isAdminUid: vi.fn(),
  createAdminClient: vi.fn(),
  inviteUserByEmail: vi.fn(),
  listUsers: vi.fn(),
  updateUserById: vi.fn(),
  generateInitialPassword: vi.fn(),
}));

vi.mock("@/lib/graph/session", () => ({ sessionUid: mocks.sessionUid }));
vi.mock("@/lib/graph/admin", () => ({ isAdminUid: mocks.isAdminUid }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock("@/lib/auth/password", () => ({ generateInitialPassword: mocks.generateInitialPassword }));

function req(body: unknown, origin = "http://127.0.0.1:3000") {
  return {
    json: async () => body,
    nextUrl: { origin },
  } as unknown as Parameters<typeof POST>[0];
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.createAdminClient.mockReturnValue({
    auth: {
      admin: {
        inviteUserByEmail: mocks.inviteUserByEmail,
        listUsers: mocks.listUsers,
        updateUserById: mocks.updateUserById,
      },
    },
  } as never);
  mocks.inviteUserByEmail.mockResolvedValue({ data: { user: null }, error: null } as never);
  mocks.listUsers.mockResolvedValue({
    data: { users: [{ id: "new-user-id", email: "ana@potidaneia.gr" }] },
    error: null,
  } as never);
  mocks.updateUserById.mockResolvedValue({ data: { user: { id: "new-user-id" } }, error: null } as never);
  mocks.generateInitialPassword.mockReturnValue("Test!Pass1234");
});

describe("POST /api/admin/invite", () => {
  it("returns 401 when unauthenticated", async () => {
    mocks.sessionUid.mockResolvedValue(null);
    const res = await POST(req({ email: "a@b.example" }));
    expect(res.status).toBe(401);
  });

  it("returns 404 when not an admin", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    mocks.isAdminUid.mockResolvedValue(false);
    const res = await POST(req({ email: "a@b.example" }));
    expect(res.status).toBe(404);
  });

  it("returns 400 for an invalid email", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    mocks.isAdminUid.mockResolvedValue(true);
    const res = await POST(req({ email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("returns 500 when the service role key is missing", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    mocks.isAdminUid.mockResolvedValue(true);
    mocks.createAdminClient.mockReturnValue(null as never);
    const res = await POST(req({ email: "a@b.example" }));
    expect(res.status).toBe(500);
  });

  it("sends the invite and returns 200 with a password for a valid email", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    mocks.isAdminUid.mockResolvedValue(true);
    const res = await POST(req({ email: "  ana@potidaneia.gr  " }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.password).toBe("Test!Pass1234");
    expect(mocks.inviteUserByEmail).toHaveBeenCalledWith("ana@potidaneia.gr", {
      redirectTo: "http://127.0.0.1:3000/auth/invite",
    });
  });

  it("sets the generated password and confirms the email on the new user", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    mocks.isAdminUid.mockResolvedValue(true);
    await POST(req({ email: "  ana@potidaneia.gr  " }));
    expect(mocks.updateUserById).toHaveBeenCalledWith("new-user-id", {
      password: "Test!Pass1234",
      email_confirm: true,
    });
  });

  it("returns 500 when listUsers fails", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    mocks.isAdminUid.mockResolvedValue(true);
    mocks.listUsers.mockResolvedValue({
      data: { users: [] },
      error: { message: "db error" },
    } as never);
    const res = await POST(req({ email: "a@b.example" }));
    expect(res.status).toBe(500);
  });

  it("returns 500 when updateUserById fails", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    mocks.isAdminUid.mockResolvedValue(true);
    mocks.updateUserById.mockResolvedValue({
      data: { user: null },
      error: { message: "update failed" },
    } as never);
    const res = await POST(req({ email: "a@b.example" }));
    expect(res.status).toBe(500);
  });

  it("maps upstream 4xx errors to 400", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    mocks.isAdminUid.mockResolvedValue(true);
    mocks.inviteUserByEmail.mockResolvedValue({
      data: { user: null },
      error: { status: 422, message: "A user with this email address has already been registered" },
    } as never);
    const res = await POST(req({ email: "a@b.example" }));
    expect(res.status).toBe(400);
  });

  it("returns 500 on unexpected upstream errors", async () => {
    mocks.sessionUid.mockResolvedValue("user-1");
    mocks.isAdminUid.mockResolvedValue(true);
    mocks.inviteUserByEmail.mockResolvedValue({
      data: { user: null },
      error: { message: "boom" },
    } as never);
    const res = await POST(req({ email: "a@b.example" }));
    expect(res.status).toBe(500);
  });
});