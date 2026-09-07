import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/graph/query-client", () => {
  return {
    queryClient: {
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
    },
  };
});

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
    useGraphStore.setState({ chatOpen: false, chatMessages: [], chatInput: "" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens chat and streams the answer from the graph endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      streamResponse(
        'The mill was built in 1850.\n---SOURCES---\n[{"label":"The mill","nodeId":"l-mill"}]',
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await useGraphStore.getState().sendChat("Tell me about the mill");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/graph/chat",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "Tell me about the mill" }),
      }),
    );
    const state = useGraphStore.getState();
    expect(state.chatOpen).toBe(true);
    expect(state.chatMessages).toHaveLength(2);
    expect(state.chatMessages[0]).toMatchObject({ role: "user", content: "Tell me about the mill" });
    expect(state.chatMessages[1].content).toBe("The mill was built in 1850.");
    expect(state.chatMessages[1].sources).toEqual([{ label: "The mill", nodeId: "l-mill" }]);
    expect(state.chatMessages[1].loading).toBe(false);
  });

  it("handles a JSON no-match response from the endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          answer: "I couldn't find relevant content in the graph for that question.",
          sources: [],
        }),
      ),
    );

    await useGraphStore.getState().sendChat("something obscure");

    const messages = useGraphStore.getState().chatMessages;
    expect(messages[1].content).toContain("couldn't find relevant content");
    expect(messages[1].sources).toEqual([]);
    expect(messages[1].loading).toBe(false);
  });

  it("shows a fallback message when the endpoint fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "Chat failed" }, 502)));

    await useGraphStore.getState().sendChat("anything");

    const messages = useGraphStore.getState().chatMessages;
    expect(messages[1].content).toContain("I couldn't reach the graph");
    expect(messages[1].sources).toEqual([]);
    expect(messages[1].loading).toBe(false);
  });

  it("ignores empty input", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await useGraphStore.getState().sendChat("   ");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(useGraphStore.getState().chatMessages).toHaveLength(0);
  });
});