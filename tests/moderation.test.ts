import { describe, it, expect } from "vitest";
import { applyModeration } from "@/lib/graph/moderation";

describe("applyModeration", () => {
  it("marks a change when status actually moves", () => {
    const r = applyModeration({ status: "pending" }, "approve");
    expect(r).toEqual({ status: "approved", changed: true });
  });
  it("returns changed=false with same status when idempotent", () => {
    const r = applyModeration({ status: "approved" }, "approve");
    expect(r).toEqual({ status: "approved", changed: false });
  });
});
