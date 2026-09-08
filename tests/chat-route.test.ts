import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { type NextRequest } from "next/server";
import { POST } from "@/app/api/graph/chat/route";

const mocks = vi.hoisted(() => ({
  sessionUid: vi.fn(),
  embedText: vi.fn(),
  matchNodesByVector: vi.fn(),
  fetchOneHopNeighbors: vi.fn(),
  fetchNodeBodies: vi.fn(),
  synthesizeChat: vi.fn(),
  parseCitations: vi.fn(),
}));

vi.mock("@/lib/graph/session", () => ({ sessionUid: mocks.sessionUid }));
vi.mock("@/lib/graph/embeddings", () => ({ embedText: mocks.embedText }));
vi.mock("@/lib/graph/combined-search", () => ({
  matchNodesByVector: mocks.matchNodesByVector,
  fetchOneHopNeighbors: mocks.fetchOneHopNeighbors,
  fetchNodeBodies: mocks.fetchNodeBodies,
}));
vi.mock("@/lib/graph/chat-synthesis", () => ({ synthesizeChat: mocks.synthesizeChat }));
vi.mock("@/lib/graph/citations", () => ({
  parseCitations: mocks.parseCitations,
  buildSubgraphFromPath: vi.fn((cited: import("@/lib/graph/types").Citation[]) => ({
    nodeIds: cited.map((c) => c.nodeId),
    edgeIds: [],
    citedNodeIds: cited.map((c) => c.nodeId),
  })),
}));

const mreq = (body: unknown) =>
  ({ json: async () => body }) as unknown as NextRequest;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fetchNodeBodies.mockResolvedValue({});
  mocks.parseCitations.mockImplementation((answer: string) => ({
    text: answer,
    citations: [],
  }));
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

  it("streams a synthesis with citations and subgraph when matches exist", async () => {
    mocks.sessionUid.mockResolvedValue("u");
    mocks.embedText.mockResolvedValue(Array(1024).fill(0.1));
    mocks.matchNodesByVector.mockResolvedValue([
      { nodeId: "n1", label: "Yiannis", nodeType: "person", similarity: 0.9, contentHash: "h" },
    ]);
    mocks.fetchOneHopNeighbors.mockResolvedValue([]);
    mocks.synthesizeChat.mockResolvedValue("Yiannis [1] was a mason.");
    mocks.parseCitations.mockReturnValue({
      text: "Yiannis [1] was a mason.",
      citations: [
        { label: "Yiannis", nodeId: "n1", nodeType: "person", slug: "yiannis", similarity: 0.9, origin: "retrieved" },
      ],
    });
    const res = await POST(mreq({ question: "Who was Yiannis?" }));
    expect(res.status).toBe(200);
    const body = await new Response(res.body).text();
    expect(body).toContain("Yiannis [1] was a mason.");
    const payload = JSON.parse(body.split("---SOURCES---")[1]);
    expect(payload.citations[0]).toMatchObject({ nodeId: "n1", origin: "retrieved" });
    expect(payload.subgraph.citedNodeIds).toEqual(["n1"]);
  });

  it("passes sanitized history to synthesizeChat", async () => {
    mocks.sessionUid.mockResolvedValue("u");
    (mocks.embedText as Mock).mockResolvedValue(Array(1024).fill(0.1));
    (mocks.matchNodesByVector as Mock).mockResolvedValue([
      { nodeId: "n1", label: "Yiannis", nodeType: "person", similarity: 0.9, contentHash: "h" },
    ]);
    (mocks.fetchOneHopNeighbors as Mock).mockResolvedValue([]);
    (mocks.synthesizeChat as Mock).mockResolvedValue("Yiannis [1] was a mason.");
    const res = await POST(mreq({ question: "And his brother?", history: [
      { question: "Who was Yiannis?", answer: "A poet." },
      "garbage",
      { question: "", answer: "bad" },
    ] }));
    expect(res.status).toBe(200);
    expect(mocks.synthesizeChat).toHaveBeenCalledWith(
      expect.objectContaining({ history: [{ question: "Who was Yiannis?", answer: "A poet." }] }),
    );
  });

  it("errors on missing question even with history present", async () => {
    mocks.sessionUid.mockResolvedValue("u");
    const res = await POST(mreq({ history: [] }));
    expect(res.status).toBe(400);
  });

  it("returns a graceful empty answer when no match meets the threshold", async () => {
    mocks.sessionUid.mockResolvedValue("u");
    mocks.embedText.mockResolvedValue(Array(1024).fill(0.1));
    mocks.matchNodesByVector.mockResolvedValue([]);
    const res = await POST(mreq({ question: "Something obscure" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.citations).toEqual([]);
    expect(mocks.synthesizeChat).not.toHaveBeenCalled();
  });
});
