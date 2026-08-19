import { describe, it, expect } from "vitest";
import { slugify, derivePrivacyFor, createNodeValues } from "@/lib/graph/createNode";

describe("slugify", () => {
  it("lowercases and normalizes", () => {
    expect(slugify("Yiayia 1924")).toBe("yiayia-1924");
    expect(slugify("  UPPER  case  ")).toBe("upper-case");
  });
  it("slugify strips non-ascii to empty", () => {
    expect(slugify("Γιάννης")).toBe("");
  });
});

describe("derivePrivacyFor", () => {
  it("living person is private", () => {
    expect(derivePrivacyFor("person", false)).toBe("private");
  });
  it("deceased person is public", () => {
    expect(derivePrivacyFor("person", true)).toBe("public");
  });
  it("non-person types are always public", () => {
    for (const t of ["family", "landmark", "toponym", "event", "path"] as const) {
      expect(derivePrivacyFor(t, false)).toBe("public");
    }
  });
});

describe("createNodeValues", () => {
  it("builds full insert values for a deceased person", () => {
    const v = createNodeValues(
      { type: "person", label: " Yiayia ", facts: { born: "1924" }, deceased: true, x: 12, y: -8 },
      "uid-1",
      "pending",
      0,
    );
    expect(v.slug).toMatch(/^yiayia-[a-z0-9]+-0$/);
    expect(v.type).toBe("person");
    expect(v.label).toBe("Yiayia");
    expect(v.status).toBe("pending");
    expect(v.privacy).toBe("public");
    expect(v.createdBy).toBe("uid-1");
    expect(v.properties).toEqual({ facts: { born: "1924" }, deceased: true, x: 12, y: -8 });
  });

  it("living person is private with null optional fields", () => {
    const v = createNodeValues({ type: "person", label: "Nikos" }, "uid", "pending", 1);
    expect(v.privacy).toBe("private");
    expect(v.subtitle).toBeNull();
    expect(v.description).toBeNull();
    expect(v.properties).toEqual({ deceased: false });
  });

  it("non-person types omit the deceased key", () => {
    const v = createNodeValues({ type: "family", label: "Tsalikis" }, "uid", "approved", 0);
    expect(v.privacy).toBe("public");
    expect(v.properties).toEqual({});
  });

  it("falls back to a stable base for non-ascii labels", () => {
    const v = createNodeValues({ type: "person", label: "Γιάννης Τσαλίκης" }, "uid", "pending", 0);
    expect(v.slug).toMatch(/^node-[a-z0-9]+-0$/);
  });
});
