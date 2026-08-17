import { describe, it, expect, vi, beforeEach } from "vitest";
import { type NextRequest } from "next/server";
import { POST } from "@/app/api/nodes/route";

const mocks = vi.hoisted(() => ({
  sessionUid: vi.fn(),
  insertValues: vi.fn(),
}));

vi.mock("@/lib/graph/session", () => ({ sessionUid: mocks.sessionUid }));
vi.mock("@/lib/graph/db", () => ({
  db: { insert: () => ({ values: mocks.insertValues }) },
}));

const mreq = (body: unknown) => ({ json: async () => body }) as unknown as NextRequest;

beforeEach(() => {
  vi.resetAllMocks();
  mocks.insertValues.mockReturnValue({ returning: async () => [{ id: "n1" }] });
});

describe("POST /api/nodes", () => {
  it("rejects unauthenticated", async () => {
    mocks.sessionUid.mockResolvedValue(null);
    const res = await POST(mreq({ label: "A" }));
    expect(res.status).toBe(401);
  });
  it("creates a living person as private/pending with deceased=false", async () => {
    mocks.sessionUid.mockResolvedValue("u1");
    const res = await POST(mreq({ label: "A", deceased: false }));
    expect(res.status).toBe(201);
    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "pending",
        privacy: "private",
        createdBy: "u1",
        properties: expect.objectContaining({ deceased: false }),
      }),
    );
  });
  it("creates a deceased person as public/pending with deceased=true", async () => {
    mocks.sessionUid.mockResolvedValue("u1");
    await POST(mreq({ label: "B", deceased: true }));
    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "pending",
        privacy: "public",
        createdBy: "u1",
        properties: expect.objectContaining({ deceased: true }),
      }),
    );
  });
});
