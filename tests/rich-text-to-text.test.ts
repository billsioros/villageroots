import { describe, it, expect } from "vitest";
import { richTextToText } from "@/lib/graph/rich-text-to-text";

describe("richTextToText", () => {
  it("returns empty string for null / undefined / non-object input", () => {
    expect(richTextToText(null)).toBe("");
    expect(richTextToText(undefined)).toBe("");
    expect(richTextToText("not a doc")).toBe("");
  });

  it("flattens nested TipTap content into plain text joined by newlines", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Hello" }] },
        { type: "paragraph", content: [{ type: "text", text: "World" }] },
      ],
    };
    expect(richTextToText(doc)).toBe("Hello\nWorld");
  });

  it("handles inline marks and nested blocks, ignoring non-text nodes", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "heading",
          content: [{ type: "text", text: "Title" }],
        },
        { type: "paragraph", content: [{ type: "hardBreak" }] },
        {
          type: "taskList",
          content: [
            {
              type: "taskItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: "done" }] }],
            },
          ],
        },
      ],
    };
    expect(richTextToText(doc)).toBe("Title\ndone");
  });

  it("skips empty paragraphs", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "A" }] },
        { type: "paragraph" },
        { type: "paragraph", content: [{ type: "text", text: "" }] },
        { type: "paragraph", content: [{ type: "text", text: "B" }] },
      ],
    };
    expect(richTextToText(doc)).toBe("A\nB");
  });
});
