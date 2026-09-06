import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "@/app/api/me/profile/route";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

function req(body: unknown) {
  return { json: async () => body } as unknown as Request;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.createClient.mockReturnValue({
    auth: { updateUser: mocks.updateUser },
  } as never);
});

describe("PATCH /api/me/profile", () => {
  it("returns 400 for a missing name", async () => {
    mocks.updateUser.mockResolvedValue({
      data: { user: { user_metadata: {} } },
      error: null,
    } as never);
    const res = await PATCH(req({ surname: "Katsari" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/name/i);
  });

  it("returns 400 for a missing surname", async () => {
    mocks.updateUser.mockResolvedValue({
      data: { user: { user_metadata: {} } },
      error: null,
    } as never);
    const res = await PATCH(req({ name: "Eleni" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/surname/i);
  });

  it("returns 400 for invalid JSON body", async () => {
    const res = await PATCH({ json: async () => { throw new Error("bad"); } } as unknown as Request);
    expect(res.status).toBe(400);
  });

  it("updates user_metadata with name and surname", async () => {
    mocks.updateUser.mockResolvedValue({
      data: { user: { user_metadata: { name: "Eleni", surname: "Katsari" } } },
      error: null,
    } as never);
    const res = await PATCH(req({ name: "Eleni", surname: "Katsari" }));
    expect(mocks.updateUser).toHaveBeenCalledWith({ data: { name: "Eleni", surname: "Katsari" } });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ name: "Eleni", surname: "Katsari" });
  });

  it("trims whitespace from name and surname", async () => {
    mocks.updateUser.mockResolvedValue({
      data: { user: { user_metadata: { name: "Eleni", surname: "Katsari" } } },
      error: null,
    } as never);
    const res = await PATCH(req({ name: "  Eleni  ", surname: "  Katsari  " }));
    expect(mocks.updateUser).toHaveBeenCalledWith({ data: { name: "Eleni", surname: "Katsari" } });
    expect(res.status).toBe(200);
  });

  it("returns 500 when the update fails", async () => {
    mocks.updateUser.mockResolvedValue({
      data: { user: null },
      error: { message: "update failed" },
    } as never);
    const res = await PATCH(req({ name: "Eleni", surname: "Katsari" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/try again/i);
  });
});