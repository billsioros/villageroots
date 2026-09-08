import { describe, it, expect } from "vitest";
import { toMarkdownWithSentinels } from "@/components/graph/citation";

describe("toMarkdownWithSentinels", () => {
  it("replaces in-range citation markers with sentinels", () => {
    expect(toMarkdownWithSentinels("Yiannis [1] built [2] it.", 2))
      .toBe("Yiannis <<CITE:1>> built <<CITE:2>> it.");
  });

  it("leaves out-of-range markers as literal text", () => {
    expect(toMarkdownWithSentinels("Note [9] and [1].", 1))
      .toBe("Note [9] and <<CITE:1>>.");
  });

  it("handles empty content and count 0", () => {
    expect(toMarkdownWithSentinels("", 3)).toBe("");
    expect(toMarkdownWithSentinels("plain [1]", 0)).toBe("plain [1]");
  });
});
