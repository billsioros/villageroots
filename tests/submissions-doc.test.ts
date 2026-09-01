import { describe, it, expect } from "vitest";
import { submissionPayloadFromDrafts, validateSubmissionShape } from "@/lib/graph/submissions";
import type { DraftNode } from "@/lib/graph/types";

const doc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "hi" }] }] };

const draft: DraftNode = {
  id: "d1",
  type: "person",
  label: "Anna",
  subtitle: "Weaver",
  description: "desc",
  documentContent: doc,
  facts: {},
  x: 1,
  y: 2,
  draft: true,
};

describe("submissions document content", () => {
  it("submissionPayloadFromDrafts includes documentContent", () => {
    const payload = submissionPayloadFromDrafts([draft], []);
    expect(payload.nodes[0].documentContent).toEqual(doc);
  });

  it("validateSubmissionShape accepts documentContent object", () => {
    const out = validateSubmissionShape({
      nodes: [{ id: "d1", type: "person", label: "Anna", documentContent: doc }],
      edges: [],
    });
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.value.nodes[0].documentContent).toEqual(doc);
  });

  it("validateSubmissionShape rejects non-object documentContent", () => {
    const outArray = validateSubmissionShape({
      nodes: [{ id: "d1", type: "person", label: "Anna", documentContent: ["bad"] }],
      edges: [],
    });
    expect(outArray.ok).toBe(false);

    const outString = validateSubmissionShape({
      nodes: [{ id: "d1", type: "person", label: "Anna", documentContent: "string" }],
      edges: [],
    });
    expect(outString.ok).toBe(false);
  });
});
