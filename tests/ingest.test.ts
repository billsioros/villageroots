import { describe, it, expect, vi } from "vitest";
import { ingestEmbedding } from "@/lib/graph/ingest";

const mocks = vi.hoisted(() => ({
  dbSelect: vi.fn(),
  dbInsert: vi.fn(),
  buildEmbeddableText: vi.fn(),
  computeContentHash: vi.fn(),
  embedText: vi.fn(),
}));

vi.mock("@/lib/graph/db", () => ({ db: { select: mocks.dbSelect, insert: mocks.dbInsert } }));
vi.mock("@/lib/graph/embeddings", () => ({
  EMBEDDING_MODEL: "nvidia/nemotron-3-embed-1b:free",
  buildEmbeddableText: mocks.buildEmbeddableText,
  computeContentHash: mocks.computeContentHash,
  embedText: mocks.embedText,
}));

const nodeRow = (over = {}) => ({
  id: "n1",
  label: "Yiannis",
  description: "Mason",
  documentContent: { type: "doc", content: [] },
  type: "person",
  status: "approved",
  privacy: "public",
  createdBy: "u1",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
});

const embeddedRow = (over = {}) => ({
  status: "embedded",
  contentHash: "abc",
  ...over,
});

function selectReturningNode(row = nodeRow(), limitRows: unknown[] | null = null) {
  mocks.dbSelect.mockReturnValueOnce({
    from: () => ({
      where: () => ({
        limit: async () => (limitRows === null ? [row] : limitRows),
      }),
    }),
  });
}

describe("ingestEmbedding", () => {
  it("skips when the existing embedding matches the current content hash", async () => {
    selectReturningNode();
    mocks.buildEmbeddableText.mockReturnValue("Yiannis\nMason");
    mocks.computeContentHash.mockReturnValue("abc");
    // second select (existing embedding lookup)
    mocks.dbSelect.mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [embeddedRow()] }) }) });
    const out = await ingestEmbedding("n1");
    expect(out).toEqual({ status: "skipped" });
    expect(mocks.embedText).not.toHaveBeenCalled();
  });

  it("embeds and upserts a node with no existing entry", async () => {
    selectReturningNode();
    mocks.dbSelect.mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [] }) }) });
    mocks.buildEmbeddableText.mockReturnValue("Yiannis\nMason");
    mocks.computeContentHash.mockReturnValue("hash1");
    mocks.embedText.mockResolvedValue(Array(1024).fill(0.5));
    mocks.dbInsert.mockReturnValue({
      values: () => ({
        onConflictDoUpdate: () => ({ returning: async () => [{ id: "e1" }] }),
      }),
    });
    const fetchImpl = vi.fn();
    const out = await ingestEmbedding("n1", { fetchImpl });
    expect(out).toEqual({ status: "embedded" });
    expect(mocks.embedText).toHaveBeenCalledWith("Yiannis\nMason", { fetchImpl });
  });

  it("records a failed state when embedding throws", async () => {
    selectReturningNode();
    mocks.dbSelect.mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [] }) }) });
    mocks.buildEmbeddableText.mockReturnValue("Yiannis");
    mocks.computeContentHash.mockReturnValue("hash2");
    mocks.embedText.mockRejectedValue(new Error("boom"));
    mocks.dbInsert.mockReturnValue({
      values: () => ({
        onConflictDoUpdate: () => ({ returning: async () => [{ id: "e2" }] }),
      }),
    });
    const out = await ingestEmbedding("n1");
    expect(out.status).toBe("failed");
    if (out.status === "failed") {
      expect(out.error).toContain("boom");
    } else {
      expect.unreachable("expected failed status");
    }
  });

  it("skips when the node no longer exists", async () => {
    selectReturningNode(nodeRow(), []);
    const out = await ingestEmbedding("missing");
    expect(out).toEqual({ status: "skipped" });
  });
});
