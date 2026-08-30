import { beforeEach, describe, expect, it } from "vitest";
import { useGraphStore } from "@/store/graphStore";

describe("contribution modal store state", () => {
  beforeEach(() => {
    useGraphStore.setState({ newNodeOpen: false });
  });

  it("opens and closes the contribution modal", () => {
    useGraphStore.getState().setNewNodeOpen(true);
    expect(useGraphStore.getState().newNodeOpen).toBe(true);
    useGraphStore.getState().setNewNodeOpen(false);
    expect(useGraphStore.getState().newNodeOpen).toBe(false);
  });

  it("no longer exposes the removed weave start step", () => {
    const s = useGraphStore.getState() as unknown as Record<string, unknown>;
    expect(s.newNodeStartStep).toBeUndefined();
    expect(s.setNewNodeStartStep).toBeUndefined();
  });
});