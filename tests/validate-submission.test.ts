import { describe, it, expect } from "vitest";
import { validateBeforeSubmit } from "@/lib/graph/validate-submission";
import { type DraftNode, type DraftEdge, type Verb } from "@/lib/graph/types";

const draft = (id: string, label = id): DraftNode => ({
  id,
  type: "person",
  label,
  x: 0,
  y: 0,
  draft: true,
});

const edge = (source: string, target: string, verb: Verb = "related_to"): DraftEdge => ({
  id: `edge-${source}-${target}`,
  source,
  target,
  verb,
  kind: "social",
  draft: true,
});

describe("validateBeforeSubmit", () => {
  it("returns null for a valid payload", () => {
    expect(
      validateBeforeSubmit(
        [draft("a", "Nikolas")],
        [edge("a", "b")],
        { a: [{ verb: "child_of" as Verb, target: "b" }] },
      ),
    ).toBeNull();
  });

  it("rejects empty draft list", () => {
    expect(validateBeforeSubmit([], [], {})).toBe("Add at least one entry");
  });

  it("rejects blank label", () => {
    expect(validateBeforeSubmit([draft("a", "   ")], [], {})).toBe(
      "All entries must have a name",
    );
  });

  it("rejects label over 200 chars", () => {
    expect(validateBeforeSubmit([draft("a", "x".repeat(201))], [], {})).toBe(
      "Entry name too long (max 200 characters)",
    );
  });

  it("rejects description over 10000 chars", () => {
    const d = draft("a", "OK");
    d.description = "x".repeat(10001);
    expect(validateBeforeSubmit([d], [], {})).toBe(
      "Description too long (max 10,000 characters)",
    );
  });

  it("rejects connection with no target", () => {
    expect(
      validateBeforeSubmit(
        [draft("a")],
        [],
        { a: [{ verb: "child_of" as Verb, target: "" }] },
      ),
    ).toBe("All connections must have a target node");
  });

  it("rejects self-loop connection", () => {
    expect(
      validateBeforeSubmit(
        [draft("a")],
        [],
        { a: [{ verb: "child_of" as Verb, target: "a" }] },
      ),
    ).toBe("A connection cannot link a node to itself");
  });

  it("rejects duplicate connection", () => {
    expect(
      validateBeforeSubmit(
        [draft("a"), draft("b")],
        [],
        {
          a: [
            { verb: "child_of" as Verb, target: "b" },
            { verb: "child_of" as Verb, target: "b" },
          ],
        },
      ),
    ).toBe("Duplicate connection detected");
  });

  it("rejects when total nodes exceed 20", () => {
    const nodes = Array.from({ length: 21 }, (_, i) => draft(`d${i}`, `Node ${i}`));
    expect(validateBeforeSubmit(nodes, [], {})).toBe(
      "Too many entries or connections",
    );
  });

  it("rejects when total edges exceed 50", () => {
    const nodes = [draft("a"), draft("b")];
    const connections = {
      a: Array.from({ length: 51 }, (_, i) => ({
        verb: "related_to" as Verb,
        target: `t${i}`,
      })),
    };
    expect(validateBeforeSubmit(nodes, [], connections)).toBe(
      "Too many entries or connections",
    );
  });
});
