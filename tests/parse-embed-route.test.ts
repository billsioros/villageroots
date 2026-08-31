import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/parse-embed/route";

const mocks = vi.hoisted(() => ({ parseEmbed: vi.fn() }));
vi.mock("@/lib/graph/embed", () => ({ parseEmbed: mocks.parseEmbed }));

function req(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

describe("POST /api/parse-embed", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns 400 for missing url", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
  });

  it("returns parsed data when parseEmbed succeeds", async () => {
    mocks.parseEmbed.mockResolvedValue({ ok: true, data: { kind: "wikipedia", url: "https://x" } });
    const res = await POST(req({ url: "https://en.wikipedia.org/wiki/X" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.kind).toBe("wikipedia");
  });

  it("returns 422 with error when parseEmbed fails", async () => {
    mocks.parseEmbed.mockResolvedValue({ ok: false, error: "Unsupported" });
    const res = await POST(req({ url: "https://example.com" }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("Unsupported");
  });

  it("returns 400 for invalid JSON", async () => {
    const bad: NextRequest = { json: async () => { throw new Error("bad"); } } as unknown as NextRequest;
    const res = await POST(bad);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("Invalid JSON body");
  });
});
