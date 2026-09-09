import { describe, it, expect } from "vitest";
import { tokenColor } from "@/lib/graph/helpers";
import {
  selectStrokeColor,
  selectHaloColor,
  highlightStrokeColor,
  highlightEdgeColor,
} from "@/lib/graph/canvas-colors";

// tokenColor resolves the fallback tokens in Node (SSR parity). The fallback
// HSL values are written CSS-style ("351 100% 61%") — lightness MUST be
// normalized to [0,1] before the HSL→RGB math, or saturated colors come out
// as invalid rgba() with negative/huge channels (canvas silently drops them).
describe("tokenColor HSL parsing", () => {
  it("converts the saturated primary fallback correctly", () => {
    // hsl(351, 100%, 61%) → rgb(255, 56, 86)
    expect(tokenColor("primary")).toBe("rgba(255, 56, 86, 1)");
  });

  it("keeps the achromatic meta token stable", () => {
    expect(tokenColor("meta")).toBe("rgba(145, 145, 145, 1)");
  });

  it("applies alpha after correct conversion", () => {
    expect(tokenColor("primary", 0.5)).toBe("rgba(255, 56, 86, 0.5)");
  });
});

// The user-facing rule: a chat/citation highlight must be painted with the
// SAME color as manually selecting a node (the selection token), never the
// brand primary. The highlight roles take no token argument so the policy
// lives in exactly one place and primary cannot leak in by accident.
describe("canvas highlight/selection colors", () => {
  it("uses the selection color for manually selected nodes", () => {
    expect(selectStrokeColor()).toBe(tokenColor("meta"));
    expect(selectHaloColor()).toBe(tokenColor("meta"));
  });

  it("colors chat/citation highlights with the SAME selection color", () => {
    expect(highlightStrokeColor()).toBe(selectStrokeColor());
    expect(highlightStrokeColor(0.3)).toBe(tokenColor("meta", 0.3));
  });

  it("colors lit edges with the same selection color", () => {
    expect(highlightEdgeColor()).toBe(selectStrokeColor());
    expect(highlightEdgeColor(0.8)).toBe(tokenColor("meta", 0.8));
  });
});
