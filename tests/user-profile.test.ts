import { describe, it, expect } from "vitest";
import { getInitials, getDisplayName } from "@/lib/utils/user-profile";

describe("getInitials", () => {
  it("returns first letter of name and surname", () => {
    expect(getInitials("Eleni", "Katsari")).toBe("EK");
  });

  it("lowercases then uppercases", () => {
    expect(getInitials("maria", "papadopoulos")).toBe("MP");
  });

  it("returns first char of name when surname is empty", () => {
    expect(getInitials("Eleni", "")).toBe("E");
  });

  it("returns first char of surname when name is empty", () => {
    expect(getInitials("", "Katsari")).toBe("K");
  });

  it("returns empty string when both empty", () => {
    expect(getInitials("", "")).toBe("");
  });

  it("handles single character names", () => {
    expect(getInitials("A", "B")).toBe("AB");
  });
});

describe("getDisplayName", () => {
  it("joins name and surname", () => {
    expect(getDisplayName("Eleni", "Katsari")).toBe("Eleni Katsari");
  });

  it("returns name only when surname is empty", () => {
    expect(getDisplayName("Eleni", "")).toBe("Eleni");
  });

  it("returns surname only when name is empty", () => {
    expect(getDisplayName("", "Katsari")).toBe("Katsari");
  });

  it("returns empty string when both empty", () => {
    expect(getDisplayName("", "")).toBe("");
  });

  it("trims whitespace", () => {
    expect(getDisplayName("  Eleni  ", "  Katsari  ")).toBe("Eleni Katsari");
  });
});
