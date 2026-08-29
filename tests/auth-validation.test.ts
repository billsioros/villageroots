import { describe, it, expect } from "vitest";
import { validateEmail, validatePassword, scorePassword } from "@/lib/auth/validation";

describe("validateEmail", () => {
  it("accepts a well-formed address", () => {
    expect(validateEmail("ana@potidaneia.gr")).toBeNull();
  });

  it("rejects an empty or blank value", () => {
    expect(validateEmail("")).toMatch(/required/i);
    expect(validateEmail("   ")).toMatch(/required/i);
  });

  it("rejects malformed addresses", () => {
    expect(validateEmail("ana")).not.toBeNull();
    expect(validateEmail("ana@potidaneia")).not.toBeNull();
    expect(validateEmail("@potidaneia.gr")).not.toBeNull();
    expect(validateEmail("ana potidaneia.gr")).not.toBeNull();
  });
});

describe("validatePassword", () => {
  it("rejects an empty password", () => {
    expect(validatePassword("")).toMatch(/required/i);
  });

  it("requires at least 8 characters", () => {
    expect(validatePassword("Abc1!ef")).toMatch(/at least 8/i);
  });

  it("requires lower, upper, digit and symbol", () => {
    expect(validatePassword("abcdefgh")).toMatch(/uppercase/i);
    expect(validatePassword("ABCDEFGH")).toMatch(/lowercase/i);
    expect(validatePassword("Abcdefgh")).toMatch(/digit/i);
    expect(validatePassword("Abcdef1h")).toMatch(/symbol/i);
  });

  it("accepts a compliant password", () => {
    expect(validatePassword("Potidaneia2024!")).toBeNull();
  });
});

describe("scorePassword", () => {
  it("scores 0 for an empty password", () => {
    expect(scorePassword("")).toBe(0);
  });

  it("scores by length and character classes", () => {
    expect(scorePassword("short")).toBe(1);
    expect(scorePassword("abcdefgh")).toBe(2);
    expect(scorePassword("Abcdefgh9")).toBe(4);
    expect(scorePassword("Potidaneia2024!")).toBe(4);
  });
});
