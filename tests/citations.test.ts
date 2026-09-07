import { describe, it, expect } from "vitest";
import type { Citation } from "@/lib/graph/types";

describe("Citation type", () => {
  it("shapes a retrieved citation", () => {
    const c: Citation = {
      label: "Yiannis",
      nodeId: "n1",
      nodeType: "person",
      slug: "yiannis",
      similarity: 0.9,
      origin: "retrieved",
    };
    expect(c.origin).toBe("retrieved");
    expect(c.nodeId).toBe("n1");
  });

  it("shapes a neighbor citation", () => {
    const c: Citation = {
      label: "Marika",
      nodeId: "n2",
      nodeType: "person",
      slug: "marika",
      similarity: 0,
      origin: "neighbor",
    };
    expect(c.origin).toBe("neighbor");
  });
});
