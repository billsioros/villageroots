import { describe, it, expect } from "vitest";
import { and, eq, ne, or } from "drizzle-orm";
import { isVisible, visibilityRule, graphPolicy } from "@/lib/graph/policy";
import { nodes } from "@/drizzle/schema";

describe("visibilityRule", () => {
  it("returns approved-only for anonymous", () => {
    expect(visibilityRule(null)).toEqual({ onlyApproved: true });
  });

  it("returns owner-aware rule for a signed-in user", () => {
    expect(visibilityRule("u1")).toEqual({ onlyApproved: false, ownerId: "u1" });
  });
});

describe("isVisible", () => {
  it("lets anonymous users see approved rows only", () => {
    expect(isVisible({ status: "approved", createdBy: "u1" }, null)).toBe(true);
    expect(isVisible({ status: "pending", createdBy: "u1" }, null)).toBe(false);
  });

  it("lets owners see their own pending rows", () => {
    expect(isVisible({ status: "pending", createdBy: "u1" }, "u1")).toBe(true);
    expect(isVisible({ status: "pending", createdBy: "u2" }, "u1")).toBe(false);
  });

  it("never exposes rejected rows", () => {
    expect(isVisible({ status: "rejected", createdBy: "u1" }, "u1")).toBe(false);
  });

  it("lets signed-in users browse other users' approved rows", () => {
    expect(isVisible({ status: "approved", createdBy: "u2" }, "u1")).toBe(true);
  });

  it("hides other users' rejected rows from signed-in users", () => {
    expect(isVisible({ status: "rejected", createdBy: "u2" }, "u1")).toBe(false);
  });
});

describe("graphPolicy", () => {
  const cols = { status: nodes.status, createdBy: nodes.createdBy };

  it("emits an approved-only condition for anonymous", () => {
    expect(graphPolicy(null, cols)).toEqual(eq(cols.status, "approved"));
  });

  it("emits approved-or-own-pending for a signed-in user", () => {
    expect(graphPolicy("u1", cols)).toEqual(
      or(
        eq(cols.status, "approved"),
        and(eq(cols.createdBy, "u1"), ne(cols.status, "rejected")),
      ),
    );
  });
});
