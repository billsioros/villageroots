import { describe, it, expect } from "vitest";
import { toMarkdownWithCitations } from "@/components/graph/citation";

describe("toMarkdownWithCitations", () => {
  it("replaces in-range citation markers with citation links", () => {
    expect(toMarkdownWithCitations("Yiannis [1] built [2] it.", 2))
      .toBe("Yiannis [1](#cite-1) built [2](#cite-2) it.");
  });

  it("leaves out-of-range markers as literal text", () => {
    expect(toMarkdownWithCitations("Note [9] and [1].", 1))
      .toBe("Note [9] and [1](#cite-1).");
  });

  it("converts CITE sentinel variations if present", () => {
    expect(toMarkdownWithCitations("Found <<CITE:1>> and [CITE:2].", 2))
      .toBe("Found [1](#cite-1) and [2](#cite-2).");
  });

  it("handles empty content and count 0", () => {
    expect(toMarkdownWithCitations("", 3)).toBe("");
    expect(toMarkdownWithCitations("plain [1]", 0)).toBe("plain [1]");
  });
});

describe("MarkdownAnswer rendering", () => {
  it("renders citation pills without displaying CITE:1 sentinels", async () => {
    const React = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { MarkdownAnswer } = await import("@/components/graph/markdown-answer");

    const html = renderToStaticMarkup(
      React.createElement(MarkdownAnswer, {
        content: "Nikolas [1] built the mill in 1892.",
        citations: [
          {
            nodeId: "n-nikolas",
            label: "Nikolas Katsaris",
            similarity: 0.9,
            origin: "retrieved",
            nodeType: "person",
            slug: "n-nikolas",
          },
        ],
      }),
    );

    expect(html).not.toContain("CITE:1");
    expect(html).not.toContain("&lt;");
    expect(html).toContain("Nikolas Katsaris");
  });
});
