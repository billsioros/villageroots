import { describe, it, expect, vi, beforeEach } from "vitest";
import { type NextRequest } from "next/server";
import { POST } from "@/app/api/graph/chat/route";

const mocks = vi.hoisted(() => ({
  sessionUid: vi.fn(),
  embedText: vi.fn(),
  matchNodesByVector: vi.fn(),
  fetchOneHopNeighbors: vi.fn(),
  synthesizeChat: vi.fn(),
}));

vi.mock("@/lib/graph/session", () => ({ sessionUid: mocks.sessionUid }));
vi.mock("@/lib/graph/embeddings", () => ({ embedText: mocks.embedText }));
vi.mock("@/lib/graph/combined-search", () => ({
  matchNodesByVector: mocks.matchNodesByVector,
  fetchOneHopNeighbors: mocks.fetchOneHopNeighbors,
}));
vi.mock("@/lib/graph/chat-synthesis", () => ({ synthesizeChat: mocks.synthesizeChat }));

const mreq = (body: unknown) =>
  ({ json: async () => body }) as unknown as NextRequest;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/graph/chat", () => {
  it("returns 401 when not signed in", async () => {
    mocks.sessionUid.mockResolvedValue(null);
    const res = await POST(mreq({ question: "Who was Yiannis?" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for a missing question", async () => {
    mocks.sessionUid.mockResolvedValue("u");
    const res = await POST(mreq({}));
    expect(res.status).toBe(400);
  });

  it("streams a synthesis with sources when matches exist", async () => {
    mocks.sessionUid.mockResolvedValue("u");
    mocks.embedText.mockResolvedValue(Array(1024).fill(0.1));
    mocks.matchNodesByVector.mockResolvedValue([
      { nodeId: "n1", label: "Yiannis", nodeType: "person", similarity: 0.9, contentHash: "h" },
    ]);
    mocks.fetchOneHopNeighbors.mockResolvedValue([]);
    mocks.synthesizeChat.mockResolvedValue("Yiannis was a mason.");
    const res = await POST(mreq({ question: "Who was Yiannis?" }));
    expect(res.status).toBe(200);
    const body = await new Response(res.body).text();
    expect(body).toContain("Yiannis was a mason.");
    expect(body).toContain(JSON.stringify([{ label: "Yiannis", nodeId: "n1" }]));
  });

  it("returns a graceful empty answer when no match meets the threshold", async () => {
    mocks.sessionUid.mockResolvedValue("u");
    mocks.embedText.mockResolvedValue(Array(1024).fill(0.1));
    mocks.matchNodesByVector.mockResolvedValue([]);
    const res = await POST(mreq({ question: "Something obscure" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sources).toEqual([]);
    expect(mocks.synthesizeChat).not.toHaveBeenCalled();
  });
});
