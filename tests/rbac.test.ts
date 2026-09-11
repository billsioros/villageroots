import { describe, it, expect, vi, beforeEach } from "vitest";
import { userRoles } from "@/drizzle/schema";

const mocks = vi.hoisted(() => {
  const onConflictDoUpdate = vi.fn();
  const values = vi.fn(() => ({ onConflictDoUpdate }));
  const insert = vi.fn(() => ({ values }));
  const select = vi.fn();
  return { insert, values, onConflictDoUpdate, select };
});

vi.mock("@/lib/graph/db", () => ({
  db: { insert: mocks.insert, select: mocks.select },
}));

import {
  isRole,
  countAdmins,
  setRoleForUser,
  getRoleForUser,
  isRoleAdmin,
} from "@/lib/graph/rbac";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.onConflictDoUpdate.mockReturnValue(undefined as never);
});

describe("isRole", () => {
  it.each(["admin", "contributor"] as const)("accepts %s", (role) => {
    expect(isRole(role)).toBe(true);
  });

  it.each([null, undefined, "", "superadmin", "owner"] as const)("rejects %s", (role) => {
    expect(isRole(role as string | null)).toBe(false);
  });
});

describe("countAdmins", () => {
  it("returns the number of admin rows", async () => {
    mocks.select.mockReturnValue({ from: () => ({ where: () => [{ value: 3 }] }) });
    await expect(countAdmins()).resolves.toBe(3);
  });

  it("returns 0 for an empty result", async () => {
    mocks.select.mockReturnValue({ from: () => ({ where: () => [] }) });
    await expect(countAdmins()).resolves.toBe(0);
  });
});

describe("setRoleForUser", () => {
  it("upserts the role row with on-conflict target on user_id", async () => {
    await setRoleForUser("abc-123", "admin");

    expect(mocks.insert).toHaveBeenCalledWith(userRoles);
    expect(mocks.values).toHaveBeenCalledWith({ userId: "abc-123", role: "admin" });
    expect(mocks.onConflictDoUpdate).toHaveBeenCalledWith({
      target: userRoles.userId,
      set: { role: "admin" },
    });
  });
});

describe("getRoleForUser / isRoleAdmin", () => {
  it("getRoleForUser still reads and returns a role or null", async () => {
    mocks.select.mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [{ role: "admin" }] }) }) });
    await expect(getRoleForUser("x")).resolves.toBe("admin");
    mocks.select.mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [] }) }) });
    await expect(getRoleForUser("x")).resolves.toBeNull();
  });

  it("isRoleAdmin stays true only for admin", () => {
    expect(isRoleAdmin("admin")).toBe(true);
    expect(isRoleAdmin("contributor")).toBe(false);
    expect(isRoleAdmin(null)).toBe(false);
  });
});