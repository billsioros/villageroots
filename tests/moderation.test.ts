import { describe, it, expect } from "vitest";
import { applyModeration, nextStatus } from "@/lib/graph/moderation";

describe("nextStatus", () => {
  it("approves a pending row", () => {
    expect(nextStatus("pending", "approve")).toBe("approved");
  });
  it("approving an already-approved row is a no-op (idempotent)", () => {
    expect(nextStatus("approved", "approve")).toBe("approved");
  });
  it("rejects a pending row", () => {
    expect(nextStatus("pending", "reject")).toBe("rejected");
  });
  it("rejecting an already-rejected row keeps rejected", () => {
    expect(nextStatus("rejected", "reject")).toBe("rejected");
  });
});

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