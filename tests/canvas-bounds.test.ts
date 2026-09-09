import { describe, expect, it } from "vitest";
import { getEdgePanDelta } from "@/lib/graph/canvas-bounds";

describe("getEdgePanDelta", () => {
  it("requests a capped camera pan toward the edge where the dragged node is held", () => {
    expect(
      getEdgePanDelta({ x: 395, y: 5 }, { width: 400, height: 300 }),
    ).toEqual({ x: 50, y: -50 });
  });

  it("does not pan while the dragged node is outside the edge band", () => {
    expect(
      getEdgePanDelta({ x: 200, y: 150 }, { width: 400, height: 300 }),
    ).toEqual({ x: 0, y: 0 });
  });
});
