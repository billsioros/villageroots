import { describe, it, expect, vi, afterEach } from "vitest";
import { saveNodeDocumentContent } from "@/lib/graph/save-node-doc";

const doc = { type: "doc", content: [] };

describe("saveNodeDocumentContent", () => {
  afterEach(() => vi.restoreAllMocks());

  it("PATCHes document_content to the node route and returns ok on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);
    const out = await saveNodeDocumentContent("person-1", doc);
    expect(out).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/graph/nodes/person-1");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse((init.body as string) ?? "{}").document_content).toEqual(doc);
  });

  it("returns the server error message on failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: "Forbidden" }) });
    vi.stubGlobal("fetch", fetchMock);
    const out = await saveNodeDocumentContent("person-1", doc);
    expect(out).toEqual({ ok: false, status: 403, error: "Forbidden" });
  });
});
