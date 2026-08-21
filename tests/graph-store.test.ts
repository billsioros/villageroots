import { beforeEach, describe, expect, it } from "vitest";
import { useGraphStore } from "@/store/graphStore";

describe("newNodeStartStep", () => {
  beforeEach(() => {
    useGraphStore.setState({ newNodeStartStep: "roster" });
  });

  it("defaults to the roster step", () => {
    expect(useGraphStore.getState().newNodeStartStep).toBe("roster");
  });

  it("can be pointed at the weave step and back", () => {
    useGraphStore.getState().setNewNodeStartStep("weave");
    expect(useGraphStore.getState().newNodeStartStep).toBe("weave");
    useGraphStore.getState().setNewNodeStartStep("roster");
    expect(useGraphStore.getState().newNodeStartStep).toBe("roster");
  });
});
