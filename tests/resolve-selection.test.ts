import { describe, it, expect } from "vitest";
import { resolveSelection } from "@/lib/graph/resolve-selection";
import type { GraphNode, DraftNode } from "@/lib/graph/types";

const node = (id: string, type: GraphNode["type"]): GraphNode => ({
  id,
  type,
  label: id,
  subtitle: "",
  description: "",
  color: "#e15a72",
  mark: "P",
  x: 0,
  y: 0,
});

const draft = (id: string, type: DraftNode["type"], label = id): DraftNode => ({
  id,
  type,
  label,
  x: 0,
  y: 0,
  draft: true,
});

const nodesMap = { n1: node("n1", "person") };
const draftNodes = [draft("d1", "landmark", "Windmill")];

describe("resolveSelection", () => {
  it("returns null when nothing is selected", () => {
    expect(resolveSelection(null, nodesMap, draftNodes)).toBeNull();
  });

  it("returns the approved node when the id is in nodesMap", () => {
    const r = resolveSelection("n1", nodesMap, draftNodes);
    expect(r).not.toBeNull();
    expect(r!.isDraft).toBe(false);
    expect(r!.node.id).toBe("n1");
  });

  it("wraps a draft into a GraphNode with TYPE_META-derived fields", () => {
    const r = resolveSelection("d1", nodesMap, draftNodes);
    expect(r).not.toBeNull();
    if (!r?.isDraft) throw new Error("expected a draft selection");
    expect(r.draft.id).toBe("d1");
    expect(r.node.color).toBe("#2f9e62"); // landmark color
    expect(r.node.mark).toBe("L"); // landmark glyph
    expect(r.node.subtitle).toBe("");
    expect(r.node.description).toBe("");
    expect(r.node.draft).toBe(true);
  });

  it("returns null for an unknown id", () => {
    expect(resolveSelection("nope", nodesMap, draftNodes)).toBeNull();
  });
});
