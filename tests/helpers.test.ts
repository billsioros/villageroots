import { describe, expect, it } from "vitest";
import { hexToRgba } from "@/lib/graph/helpers";

describe("hexToRgba", () => {
  it("converts a #rrggbb hex to an rgba() string", () => {
    expect(hexToRgba("#e15a72", 0.1)).toBe("rgba(225, 90, 114, 0.1)");
  });

  it("applies the alpha channel", () => {
    expect(hexToRgba("#000000", 0.22)).toBe("rgba(0, 0, 0, 0.22)");
  });

  it("handles alpha of 1", () => {
    expect(hexToRgba("#ffffff", 1)).toBe("rgba(255, 255, 255, 1)");
  });
});
