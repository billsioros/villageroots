import { describe, it, expect } from "vitest";
import { derivePrivacy, maskLivingPerson, isLivingPerson } from "@/lib/graph/policy";

describe("derivePrivacy", () => {
  it("deceased persons are public (historical)", () => {
    expect(derivePrivacy(true)).toBe("public");
  });
  it("living persons are private by default", () => {
    expect(derivePrivacy(false)).toBe("private");
  });
});

describe("isLivingPerson", () => {
  it("treats a person without deceased flag as living", () => {
    expect(isLivingPerson({ type: "person", properties: {} })).toBe(true);
  });
  it("treats a deceased person as not living", () => {
    expect(isLivingPerson({ type: "person", properties: { deceased: true } })).toBe(false);
  });
  it("is living=false for non-person nodes", () => {
    expect(isLivingPerson({ type: "landmark", properties: {} })).toBe(false);
  });
  it("parses string 'true' from JSONB as deceased", () => {
    expect(isLivingPerson({ type: "person", properties: { deceased: "true" } })).toBe(false);
  });
});

describe("maskLivingPerson", () => {
  const row = {
    id: "n1", slug: "n1", status: "approved" as const,
    label: "Maria Katsaris", subtitle: "b. 1970", description: "private body",
    properties: { x: 10, y: 20, deceased: false, notes: "secret" },
  };
  it("masks a private living person to a generic label and strips fields", () => {
    const out = maskLivingPerson(row);
    expect(out.label).toBe("Living Person");
    expect(out.subtitle).toBe("");
    expect(out.description).toBe("");
    expect(out.properties).not.toHaveProperty("notes");
    expect(out.properties).toHaveProperty("x", 10);
  });
});
