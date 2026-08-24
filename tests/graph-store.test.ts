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

  it("resets the start step when the panel closes via setNewNodeOpen(false)", () => {
    useGraphStore.getState().setNewNodeStartStep("weave");
    useGraphStore.getState().setNewNodeOpen(true);
    useGraphStore.getState().setNewNodeOpen(false);
    expect(useGraphStore.getState().newNodeStartStep).toBe("roster");
    expect(useGraphStore.getState().newNodeOpen).toBe(false);
  });

  it("leaves the start step untouched when opening", () => {
    useGraphStore.getState().setNewNodeStartStep("weave");
    useGraphStore.getState().setNewNodeOpen(true);
    expect(useGraphStore.getState().newNodeStartStep).toBe("weave");
    expect(useGraphStore.getState().newNodeOpen).toBe(true);
  });
});
