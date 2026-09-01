import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildNodeDocSave } from "@/components/graph/document-panel";

describe("buildNodeDocSave", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true }),
    );
  });

  it("calls updateNode with documentContent after a successful save", async () => {
    const updateNode = vi.fn();
    const onSave = buildNodeDocSave("node-id", updateNode);
    await expect(onSave({ type: "doc", content: [] })).resolves.toBeUndefined();
    expect(updateNode).toHaveBeenCalledWith("node-id", {
      documentContent: { type: "doc", content: [] },
    });
  });
});
