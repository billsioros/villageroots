import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";
import type { NextRequest } from "next/server";
import { POST } from "@/app/api/graph/chat/route";

/**
 * Post-fix MatchNode contract: combined-search normalizes ids to slugs (the
 * canvas id space). The route must pass them through verbatim — any uuid that
 * leaks into citations/subgraphs silently no-ops on the canvas.
 */
const matchRow = {
  nodeId: "yiannis-katsaris",
  slug: "yiannis-katsaris",
  label: "Yiannis",
  nodeType: "person",
  similarity: 0.9,
  contentHash: "h",
};

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
    nodeIds: cited.map((c) => c.slug),
    edgeIds: [],
    citedNodeIds: cited.map((c) => c.slug),
  })),
}));

const mreq = (body: unknown) =>
  ({ json: async () => body }) as unknown as NextRequest;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fetchNodeBodies.mockResolvedValue({});
  mocks.matchNodesByVector.mockResolvedValue([matchRow]);
  mocks.fetchOneHopNeighbors.mockResolvedValue([]);
  mocks.synthesizeChat.mockResolvedValue("Yiannis [1] was a mason.");
  mocks.parseCitations.mockImplementation((answer: string, pools: { retrieved: import("@/lib/graph/types").Citation[]; neighbors: import("@/lib/graph/types").Citation[] }) => ({
    text: answer,
    citations: [...pools.retrieved.slice(0, 1), ...pools.neighbors.slice(0, 1)],
  }));
});

describe("POST /api/graph/chat citations use canvas (slug) ids", () => {
  it("emits citation nodeId AND slug as the node slug, never the uuid", async () => {
    mocks.sessionUid.mockResolvedValue("u");
    mocks.embedText.mockResolvedValue(Array(1024).fill(0.1));

    const res = await POST(mreq({ question: "Who was Yiannis?" }));
    expect(res.status).toBe(200);
    const body = await new Response(res.body).text();
    const payload = JSON.parse(body.split("---SOURCES---")[1]);

    expect(payload.citations).toHaveLength(1);
    expect(payload.citations[0].nodeId).toBe("yiannis-katsaris");
    expect(payload.citations[0].slug).toBe("yiannis-katsaris");
    expect(payload.subgraph.citedNodeIds).toEqual(["yiannis-katsaris"]);
    expect(payload.subgraph.nodeIds).toEqual(["yiannis-katsaris"]);
  });

  it("emits neighbor citations keyed by slug too", async () => {
    mocks.sessionUid.mockResolvedValue("u");
    mocks.embedText.mockResolvedValue(Array(1024).fill(0.1));
    mocks.fetchOneHopNeighbors.mockResolvedValue([
      {
        edgeId: "yiannis-related-to-marika",
        sourceId: "yiannis-katsaris",
        targetId: "marika",
        sourceUuid: "22222222-2222-2222-2222-222222222222",
        targetUuid: "33333333-3333-3333-3333-333333333333",
        verb: "related_to",
        neighborLabel: "Marika",
        neighborType: "person",
      },
    ]);

    const res = await POST(mreq({ question: "Who is related to Yiannis?" }));
    const body = await new Response(res.body).text();
    const payload = JSON.parse(body.split("---SOURCES---")[1]);

    const neighbor = payload.citations.find(
      (c: { origin: string }) => c.origin === "neighbor",
    );
    expect(neighbor).toBeDefined();
    expect(neighbor.nodeId).toBe("marika");
    expect(neighbor.slug).toBe("marika");
  });

  it("passes slug-keyed matches to synthesizeChat context", async () => {
    mocks.sessionUid.mockResolvedValue("u");
    mocks.embedText.mockResolvedValue(Array(1024).fill(0.1));

    await POST(mreq({ question: "Who was Yiannis?" }));

    expect(mocks.synthesizeChat).toHaveBeenCalledWith(
      expect.objectContaining({
        matches: [expect.objectContaining({ nodeId: "yiannis-katsaris", slug: "yiannis-katsaris" })],
      }),
    );
  });

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

  it("passes sanitized history to synthesizeChat", async () => {
    mocks.sessionUid.mockResolvedValue("u");
    (mocks.embedText as Mock).mockResolvedValue(Array(1024).fill(0.1));

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
