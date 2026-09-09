import { describe, expect, it } from "vitest";
import {
  computeTreeFitCamera,
  computeSubgraphFitCamera,
} from "@/lib/graph/canvas-camera";

describe("computeTreeFitCamera", () => {
  it("computes centered position and fitted zoom capped at 0.9", () => {
    const bounds = { minX: 100, maxX: 500, minY: 200, maxY: 600 };
    const size = { width: 800, height: 600 };
    const target = computeTreeFitCamera(bounds, size, 1.0);
    expect(target).toEqual({
      x: 300,
      y: 400,
      zoom: 0.9,
    });
  });

  it("falls back to current zoom if bounds are empty or degenerate", () => {
    const bounds = { minX: 200, maxX: 200, minY: 200, maxY: 200 };
    const size = { width: 800, height: 600 };
    const target = computeTreeFitCamera(bounds, size, 1.25);
    expect(target).toEqual({
      x: 200,
      y: 200,
      zoom: 1.25,
    });
  });
});

describe("computeSubgraphFitCamera", () => {
  it("computes center and zoom to fit matching subgraph nodes", () => {
    const nodes = [
      { id: "n1", x: 100, y: 100 },
      { id: "n2", x: 300, y: 200 },
      { id: "n3", x: 900, y: 900 },
    ];
    const size = { width: 800, height: 600 };
    const target = computeSubgraphFitCamera(nodes, ["n1", "n2"], size);
    expect(target).not.toBeNull();
    expect(target?.x).toBe(200);
    expect(target?.y).toBe(150);
    expect(target?.zoom).toBeLessThanOrEqual(1.4);
  });

  it("handles a single focused node with default zoom 1.4", () => {
    const nodes = [{ id: "n1", x: 150, y: 250 }];
    const size = { width: 800, height: 600 };
    const target = computeSubgraphFitCamera(nodes, ["n1"], size);
    expect(target).toEqual({
      x: 150,
      y: 250,
      zoom: 1.4,
    });
  });

  it("returns null if no focused nodes have valid positions", () => {
    const nodes = [{ id: "n1" }];
    const size = { width: 800, height: 600 };
    const target = computeSubgraphFitCamera(nodes, ["n1"], size);
    expect(target).toBeNull();
  });
});
