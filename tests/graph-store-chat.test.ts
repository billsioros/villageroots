import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/graph/query-client", () => {
  return {
    queryClient: {
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
    },
  };
});

const { toast } = vi.hoisted(() => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), loading: vi.fn() },
}));

vi.mock("sonner", () => ({ toast }));

import { useGraphStore } from "@/store/graphStore";

const encoder = new TextEncoder();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function streamResponse(text: string): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

describe("sendChat GraphRAG", () => {
  beforeEach(() => {
    useGraphStore.setState({
      chatMessages: [],
      chatInput: "",
      focusNodeIds: [],
      focusNonce: 0,
      litIds: [],
      litEdgeIds: [],
      flashIds: [],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses citations and subgraph from the stream", async () => {
    const payload = {
      citations: [
        { label: "The Mill", nodeId: "l-mill", nodeType: "landmark", slug: "l-mill", similarity: 0.9, origin: "retrieved" as const },
      ],
      subgraph: { nodeIds: ["l-mill", "n-adjacent"], edgeIds: ["e1"], citedNodeIds: ["l-mill"] },
    };
    const fetchMock = vi.fn().mockResolvedValue(
      streamResponse(
        "The mill was built in 1850.\n---SOURCES---\n" + JSON.stringify(payload),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await useGraphStore.getState().sendChat("Tell me about the mill");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/graph/chat",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "Tell me about the mill", history: [] }),
      }),
    );
    const state = useGraphStore.getState();
    expect(state.chatMessages).toHaveLength(2);
    expect(state.chatMessages[0]).toMatchObject({ role: "user", content: "Tell me about the mill" });
    expect(state.chatMessages[1].content).toBe("The mill was built in 1850.");
    expect(state.chatMessages[1].citations).toEqual(payload.citations);
    expect(state.chatMessages[1].path).toEqual({ nodeIds: payload.subgraph.nodeIds, edgeIds: payload.subgraph.edgeIds });
    expect(state.chatMessages[1].loading).toBe(false);
  });

  it("derives the path from citations when the stream payload omits subgraph", async () => {
    const citations = [
      { label: "The Mill", nodeId: "l-mill", nodeType: "landmark", slug: "l-mill", similarity: 0.9, origin: "retrieved" as const },
      { label: "Adjacent House", nodeId: "n-adjacent", nodeType: "person", slug: "n-adjacent", similarity: 0.8, origin: "neighbor" as const },
      { label: "The Mill (again)", nodeId: "l-mill", nodeType: "landmark", slug: "l-mill", similarity: 0.7, origin: "retrieved" as const },
    ];
    const fetchMock = vi.fn().mockResolvedValue(
      streamResponse(
        "The mill was built in 1850.\n---SOURCES---\n" + JSON.stringify({ citations }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await useGraphStore.getState().sendChat("Tell me about the mill");

    const message = useGraphStore.getState().chatMessages[1];
    expect(message.content).toBe("The mill was built in 1850.");
    expect(message.citations).toEqual(citations);
    expect(message.path).toEqual({ nodeIds: ["l-mill", "n-adjacent"], edgeIds: [] });
    expect(message.loading).toBe(false);
  });

  it("handles a JSON no-match response from the endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          answer: "I couldn't find relevant content in the graph for that question.",
          citations: [],
        }),
      ),
    );

    await useGraphStore.getState().sendChat("something obscure");

    const messages = useGraphStore.getState().chatMessages;
    expect(messages[1].content).toContain("couldn't find relevant content");
    expect(messages[1].citations).toEqual([]);
    expect(messages[1].loading).toBe(false);
  });

  it("parses citations from a JSON response", async () => {
    const citations = [
      { label: "The Mill", nodeId: "l-mill", nodeType: "landmark", slug: "l-mill", similarity: 0.9, origin: "retrieved" as const },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          answer: "I found the mill in the graph.",
          citations,
        }),
      ),
    );

    await useGraphStore.getState().sendChat("something");

    const message = useGraphStore.getState().chatMessages[1];
    expect(message.content).toBe("I found the mill in the graph.");
    expect(message.citations).toEqual(citations);
    expect(message.loading).toBe(false);
  });

  it("shows a fallback message when the endpoint fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "Chat failed" }, 502)));

    await useGraphStore.getState().sendChat("anything");

    const messages = useGraphStore.getState().chatMessages;
    expect(messages[1].content).toContain("I couldn't reach the graph");
    expect(messages[1].citations).toEqual([]);
    expect(messages[1].loading).toBe(false);
    expect(toast.error).toHaveBeenCalledWith("Chat is busy right now — try again shortly.");
  });

  it("shows an error toast when a rate limit response arrives", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "Rate limited" }, 429)));

    await useGraphStore.getState().sendChat("anything");

    const state = useGraphStore.getState();
    expect(state.chatMessages[1].content).toContain("I couldn't reach the graph");
    expect(toast.error).toHaveBeenCalledWith("Too many requests — try again in a moment.");
  });

  it("shows an error toast when the network request throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

    await useGraphStore.getState().sendChat("anything");

    const state = useGraphStore.getState();
    expect(state.chatMessages[1].content).toContain("I couldn't reach the graph");
    expect(toast.error).toHaveBeenCalledWith("Chat is busy right now — try again shortly.");
  });

  it("includes the last 3 exchanges as history in the request", async () => {
    useGraphStore.setState({ chatMessages: [
      { id: "u1", role: "user", content: "first" },
      { id: "a1", role: "assistant", content: "one" },
      { id: "u2", role: "user", content: "second" },
      { id: "a2", role: "assistant", content: "two" },
    ], chatInput: "third" });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ answer: "three", citations: [] }));
    vi.stubGlobal("fetch", fetchMock);
    await useGraphStore.getState().sendChat("third");
    const [, init] = (fetch as unknown as Mock).mock.calls.at(-1) as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ question: "third", history: [
      { question: "first", answer: "one" },
      { question: "second", answer: "two" },
    ] });
  });

  it("ignores empty input", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await useGraphStore.getState().sendChat("   ");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(useGraphStore.getState().chatMessages).toHaveLength(0);
  });

  it("clearChat empties messages and input", () => {
    useGraphStore.setState({ chatMessages: [
      { id: "u1", role: "user", content: "hi" },
      { id: "a1", role: "assistant", content: "hello" },
    ], chatInput: "draft" });
    useGraphStore.getState().clearChat();
    const s = useGraphStore.getState();
    expect(s.chatMessages).toEqual([]);
    expect(s.chatInput).toBe("");
  });

  it("autofocuses the cited subgraph once the stream answer completes", async () => {
    const payload = {
      citations: [
        { label: "The Mill", nodeId: "l-mill", nodeType: "landmark", slug: "l-mill", similarity: 0.9, origin: "retrieved" as const },
      ],
      subgraph: { nodeIds: ["l-mill", "n-adjacent"], edgeIds: ["e1"], citedNodeIds: ["l-mill"] },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(streamResponse("Built in 1850.\n---SOURCES---\n" + JSON.stringify(payload))),
    );

    await useGraphStore.getState().sendChat("Tell me about the mill");

    const s = useGraphStore.getState();
    expect(s.litIds).toEqual(["l-mill", "n-adjacent"]);
    expect(s.litEdgeIds).toEqual(["e1"]);
    expect(s.focusNodeIds).toEqual(["l-mill", "n-adjacent"]);
    expect(s.focusNonce).toBe(1);
  });

  it("autofocuses the citation nodes from a JSON response", async () => {
    const citations = [
      { label: "The Mill", nodeId: "l-mill", nodeType: "landmark", slug: "l-mill", similarity: 0.9, origin: "retrieved" as const },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ answer: "I found the mill.", citations })),
    );

    await useGraphStore.getState().sendChat("something");

    const s = useGraphStore.getState();
    expect(s.litIds).toEqual(["l-mill"]);
    expect(s.focusNodeIds).toEqual(["l-mill"]);
    expect(s.focusNonce).toBe(1);
  });

  it("leaves the graph alone when the answer has no citations", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ answer: "No idea.", citations: [] })));

    await useGraphStore.getState().sendChat("anything");

    const s = useGraphStore.getState();
    expect(s.litIds).toEqual([]);
    expect(s.litEdgeIds).toEqual([]);
    expect(s.focusNodeIds).toEqual([]);
    expect(s.focusNonce).toBe(0);
  });

  it("focusSubgraph records ids and bumps the nonce; clearFocus resets", () => {
    const s = useGraphStore.getState();
    s.focusSubgraph(["a", "b"]);
    const first = useGraphStore.getState();
    expect(first.focusNodeIds).toEqual(["a", "b"]);
    const nonce1 = first.focusNonce;
    first.focusSubgraph(["a", "b"]);
    expect(useGraphStore.getState().focusNonce).toBe(nonce1 + 1);
    useGraphStore.getState().clearFocus();
    expect(useGraphStore.getState().focusNodeIds).toEqual([]);
  });
});