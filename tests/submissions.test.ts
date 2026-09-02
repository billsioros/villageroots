import { describe, it, expect } from "vitest";
import {
  validateSubmissionShape,
  resolveEdgeEndpoints,
  submissionPayloadFromDrafts,
  MAX_SUBMISSION_NODES,
} from "@/lib/graph/submissions";
import { type DraftNode, type DraftEdge, type NodeType, type Verb } from "@/lib/graph/types";

const n = (id: string, type: NodeType = "person", label = id): Record<string, unknown> => ({
  id,
  type,
  label,
});
const e = (source: string, target: string, verb: Verb = "related_to"): Record<string, unknown> => ({
  source,
  target,
  verb,
});
const good = (): Record<string, unknown> => ({ nodes: [n("draft-a", "person", "Yiayia")], edges: [] });

describe("validateSubmissionShape", () => {
  it("accepts a valid payload", () => {
    const r = validateSubmissionShape(good());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.nodes[0].label).toBe("Yiayia");
  });
  it("rejects when nodes is empty or missing", () => {
    expect(validateSubmissionShape({ nodes: [], edges: [] }).ok).toBe(false);
    expect(validateSubmissionShape({}).ok).toBe(false);
  });
  it("rejects unknown node type", () => {
    expect(validateSubmissionShape({ ...good(), nodes: [{ id: "d", type: "alien", label: "X" }] }).ok).toBe(false);
  });
  it("rejects unknown verb", () => {
    expect(validateSubmissionShape({ ...good(), edges: [e("draft-a", "draft-b", "teleported" as Verb)] }).ok).toBe(false);
  });
  it("rejects a blank label", () => {
    expect(validateSubmissionShape({ nodes: [n("d", "person", "   ")], edges: [] }).ok).toBe(false);
  });
  it("rejects a label over 200 chars", () => {
    expect(validateSubmissionShape({ nodes: [n("d", "person", "x".repeat(201))], edges: [] }).ok).toBe(false);
  });
  it("rejects a description over 10000 chars", () => {
    expect(
      validateSubmissionShape({ nodes: [{ id: "d", type: "person", label: "A", description: "x".repeat(10001) }], edges: [] }).ok,
    ).toBe(false);
  });
  it("rejects a fact value over 1000 chars", () => {
    expect(
      validateSubmissionShape({
        nodes: [{ id: "d", type: "person", label: "A", facts: { born: "x".repeat(1001) } }],
        edges: [],
      }).ok,
    ).toBe(false);
  });
  it("rejects more than 20 nodes", () => {
    const nodes = Array.from({ length: MAX_SUBMISSION_NODES + 1 }, (_, i) => n(`draft-${i}`));
    expect(validateSubmissionShape({ nodes, edges: [] }).ok).toBe(false);
  });
  it("rejects more than 50 edges", () => {
    const edges = Array.from({ length: 51 }, () => e("a", "b"));
    expect(validateSubmissionShape({ nodes: [n("a"), n("b")], edges }).ok).toBe(false);
  });
  it("rejects duplicate edges (source,target,verb)", () => {
    expect(validateSubmissionShape({ nodes: [n("a"), n("b")], edges: [e("a", "b"), e("a", "b")] }).ok).toBe(false);
  });
  it("rejects a self-loop edge (source === target)", () => {
    expect(validateSubmissionShape({ nodes: [n("a"), n("b")], edges: [e("a", "a")] }).ok).toBe(false);
  });
  it("rejects duplicate node ids", () => {
    expect(validateSubmissionShape({ nodes: [n("draft-a"), n("draft-a", "family")], edges: [] }).ok).toBe(false);
  });
});

describe("resolveEdgeEndpoints", () => {
  it("maps draft ids and approved slugs to node ids", () => {
    const r = resolveEdgeEndpoints(
      [{ source: "draft-a", target: "yiayia", verb: "child_of" }],
      new Set(["draft-a"]),
      new Map([["yiayia", "n-9"]]),
    );
    expect(r).toEqual({ ok: true, edges: [{ source: "draft-a", target: "n-9", verb: "child_of" }] });
  });
  it("rejects unknown endpoints", () => {
    const r = resolveEdgeEndpoints(
      [{ source: "draft-a", target: "missing", verb: "child_of" }],
      new Set(["draft-a"]),
      new Map(),
    );
    expect(r.ok).toBe(false);
  });
  it("rejects a self-loop after resolution", () => {
    const r = resolveEdgeEndpoints(
      [{ source: "yiayia", target: "yiayia", verb: "related_to" }],
      new Set(),
      new Map([["yiayia", "n-9"]]),
    );
    expect(r.ok).toBe(false);
  });
  it("rejects an unknown target when the source slug resolves", () => {
    const r = resolveEdgeEndpoints(
      [{ source: "yiayia", target: "missing", verb: "child_of" }],
      new Set(),
      new Map([["yiayia", "n-9"]]),
    );
    expect(r).toEqual({ ok: false, error: "Unknown node: missing" });
  });
});

describe("submissionPayloadFromDrafts", () => {
  it("maps drafts into the wire format", () => {
    const drafts: DraftNode[] = [
      { id: "draft-a", type: "person", label: "Yiayia", facts: { born: "1924" }, x: 1, y: 2, draft: true },
    ];
    const edges: DraftEdge[] = [
      { id: "draft-edge-1", source: "draft-a", target: "n-9", verb: "child_of", kind: "social", draft: true },
    ];
    expect(submissionPayloadFromDrafts(drafts, edges)).toEqual({
      nodes: [
        {
          id: "draft-a",
          type: "person",
          label: "Yiayia",
          subtitle: null,
          description: null,
          documentContent: null,
          facts: { born: "1924" },
          deceased: null,
          x: 1,
          y: 2,
        },
      ],
      edges: [{ source: "draft-a", target: "n-9", verb: "child_of" }],
    });
  });
});
