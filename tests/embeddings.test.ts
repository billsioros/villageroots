import { describe, it, expect, vi, afterEach } from "vitest";
import {
  EMBEDDING_MODEL,
  buildEmbeddableText,
  computeContentHash,
  embedText,
} from "@/lib/graph/embeddings";
import type { NodeRow } from "@/drizzle/schema";

const node = (over: Partial<NodeRow> = {}): NodeRow =>
  ({
    id: "n1",
    label: "Yiannis Papadopoulos",
    subtitle: null,
    description: "A local mason.",
    documentContent: {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Born 1902." }] }],
    },
    type: "person",
    status: "approved",
    privacy: "public",
    createdBy: "u1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }) as NodeRow;

describe("embeddings helpers", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("exposes the free nemotron embedding model", () => {
    expect(EMBEDDING_MODEL).toBe("nvidia/nemotron-3-embed-1b:free");
  });

  it("computes a stable SHA-256 hash of arbitrary text", () => {
    const a = computeContentHash("hello");
    const b = computeContentHash("hello");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(computeContentHash("world"));
  });

  it("builds embeddable text from label, description, and document content", () => {
    const row = node();
    const text = buildEmbeddableText(row);
    expect(text).toContain("Yiannis Papadopoulos");
    expect(text).toContain("A local mason.");
    expect(text).toContain("Born 1902.");
  });

  it("tolerates missing description and document content", () => {
    const text = buildEmbeddableText(node({ description: null, documentContent: null }));
    expect(text).toBe("Yiannis Papadopoulos");
  });

  it("embeds text via OpenRouter and returns the vector", async () => {
    const prev = process.env.OPENROUTER_API_KEY;
    process.env.OPENROUTER_API_KEY = "test-key";
    try {
      const vector = Array.from({ length: 2048 }, (_, i) => i / 2048);
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ embedding: vector }],
        }),
      });
      const out = await embedText("some text", { fetchImpl: fetchMock as unknown as typeof fetch });
      expect(out).toEqual(vector);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("https://openrouter.ai/api/v1/embeddings");
      expect(JSON.parse((init.body as string) ?? "{}").model).toBe(EMBEDDING_MODEL);
    } finally {
      process.env.OPENROUTER_API_KEY = prev;
    }
  });

  it("throws when OpenRouter returns an error", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 429, text: async () => "rate limited" });
    await expect(embedText("x", { fetchImpl: fetchMock as unknown as typeof fetch })).rejects.toThrow();
  });

  it("throws when no vector is returned", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
    });
    await expect(embedText("x", { fetchImpl: fetchMock as unknown as typeof fetch })).rejects.toThrow();
  });
});
