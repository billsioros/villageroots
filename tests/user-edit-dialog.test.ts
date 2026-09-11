import { describe, it, expect } from "vitest";
import { buildUserPatch, type ManagedUser } from "@/components/admin/user-edit-dialog";

const user: ManagedUser = {
  id: "u1",
  email: "eleni@potidaneia.gr",
  name: "Eleni",
  surname: "Katsari",
  role: "contributor",
  is_active: true,
};

describe("buildUserPatch", () => {
  it("sends both name and surname when only the surname changed", () => {
    const patch = buildUserPatch("Eleni", "Papadaki", "contributor", true, user);
    expect(patch).toEqual({ name: "Eleni", surname: "Papadaki" });
  });

  it("sends both name and surname when only the first name changed", () => {
    const patch = buildUserPatch("Maria", "Katsari", "contributor", true, user);
    expect(patch).toEqual({ name: "Maria", surname: "Katsari" });
  });

  it("returns an empty patch when nothing changed", () => {
    const patch = buildUserPatch("Eleni", "Katsari", "contributor", true, user);
    expect(patch).toEqual({});
  });

  it("sends only the role when only the role changed", () => {
    const patch = buildUserPatch("Eleni", "Katsari", "admin", true, user);
    expect(patch).toEqual({ role: "admin" });
  });

  it("sends only isActive when only the status changed", () => {
    const patch = buildUserPatch("Eleni", "Katsari", "contributor", false, user);
    expect(patch).toEqual({ isActive: false });
  });
});