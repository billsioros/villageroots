import { describe, it, expect } from "vitest";
import { nodeRowToGraph, toNodeRow } from "@/lib/graph/mappers";
import { createNodeValues } from "@/lib/graph/createNode";
import type { NodeRow } from "@/drizzle/schema";

const doc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "hi" }] }] };

function baseRow(): NodeRow {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    slug: "person-1",
    type: "person",
    label: "Anna",
    subtitle: "Weaver",
    description: "d",
    properties: { x: 1, y: 2 },
    status: "approved",
    privacy: "public",
    createdBy: "u1",
    createdAt: new Date(),
    updatedAt: new Date(),
    documentContent: null,
  } as unknown as NodeRow;
}

describe("document content mapping", () => {
  it("nodeRowToGraph maps document_content to documentContent", () => {
    const node = nodeRowToGraph({ ...baseRow(), documentContent: doc });
    expect(node.documentContent).toEqual(doc);
  });

  it("nodeRowToGraph leaves documentContent undefined when null", () => {
    const node = nodeRowToGraph(baseRow());
    expect(node.documentContent).toBeUndefined();
  });

  it("toNodeRow includes documentContent", () => {
    const row = toNodeRow({ ...nodeRowToGraph(baseRow()), documentContent: doc } as never);
    expect(row.documentContent).toEqual(doc);
  });

  it("createNodeValues sets document_content from input.documentContent", () => {
    const vals = createNodeValues(
      { type: "person", label: "Anna", documentContent: doc } as never,
      "u1",
      "approved",
      0,
    );
    expect(vals.documentContent).toEqual(doc);
  });

  it("createNodeValues defaults documentContent to null when omitted", () => {
    const vals = createNodeValues({ type: "person", label: "Anna" } as never, "u1", "approved", 0);
    expect(vals.documentContent).toBeNull();
  });
});
