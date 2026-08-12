import { describe, it, expect } from "vitest";
import { isRoleAdmin, type Role } from "@/lib/graph/rbac";

describe("isRoleAdmin", () => {
  it("returns true for admin", () => {
    expect(isRoleAdmin("admin" as Role)).toBe(true);
  });
  it("returns false for contributor", () => {
    expect(isRoleAdmin("contributor" as Role)).toBe(false);
  });
  it("returns false for undefined", () => {
    expect(isRoleAdmin(undefined)).toBe(false);
  });
});
