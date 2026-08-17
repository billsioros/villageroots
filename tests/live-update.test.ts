import { describe, it, expect } from "vitest";
import { invalidationKeys } from "@/lib/graph/queries";

describe("graph invalidation keys", () => {
  it("exposes node, edge, and review query keys for invalidation", () => {
    expect(invalidationKeys.nodes).toEqual(["graph", "nodes"]);
    expect(invalidationKeys.edges).toEqual(["graph", "edges"]);
    expect(invalidationKeys.review).toEqual(["admin-review"]);
  });
});
