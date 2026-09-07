import { describe, it, expect } from "vitest";
import { splitAnswerIntoSegments } from "@/components/graph/citation";

describe("splitAnswerIntoSegments", () => {
  it("splits text around [N] markers into text and citation segments", () => {
    const segments = splitAnswerIntoSegments("Yiannis [1] was a mason [2].", 3);
    expect(segments).toEqual([
      { type: "text", value: "Yiannis " },
      { type: "citation", index: 1, value: "[1]" },
      { type: "text", value: " was a mason " },
      { type: "citation", index: 2, value: "[2]" },
      { type: "text", value: "." },
    ]);
  });

  it("returns a single text segment when there are no markers", () => {
    const segments = splitAnswerIntoSegments("plain text", 0);
    expect(segments).toEqual([{ type: "text", value: "plain text" }]);
  });

  it("skips citation markers whose index is out of range", () => {
    const segments = splitAnswerIntoSegments("x [1] y [9] z", 1);
    const citations = segments.filter((s) => s.type === "citation");
    expect(citations).toHaveLength(1);
    expect(citations[0].index).toBe(1);
  });
});
