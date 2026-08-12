import { describe, it, expect } from "vitest";
import { isRoleAdmin } from "@/lib/graph/rbac";

describe("isAdminUid is a thin wrapper around getRoleForUser", () => {
  it("classifies the admin role as admin", () => {
    expect(isRoleAdmin("admin")).toBe(true);
  });
});
