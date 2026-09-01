import { describe, it, expect } from "vitest";
import { isEmptyDoc, emptyDoc, withText } from "@/lib/graph/rich-text-utils";

describe("rich text utils", () => {
  it("emptyDoc is an empty TipTap doc", () => {
    expect(isEmptyDoc(emptyDoc())).toBe(true);
  });

  it("isEmptyDoc returns true for null and empty object", () => {
    expect(isEmptyDoc(null)).toBe(true);
    expect(isEmptyDoc({})).toBe(true);
  });

  it("withText wraps a string in a paragraph doc", () => {
    const doc = withText("hello");
    expect(isEmptyDoc(doc)).toBe(false);
    expect(doc).toMatchObject({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "hello" }] }],
    });
  });

  it("withText returns an empty doc for empty string", () => {
    expect(isEmptyDoc(withText(""))).toBe(true);
  });
});
