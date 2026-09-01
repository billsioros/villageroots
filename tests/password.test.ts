import { describe, it, expect } from "vitest";
import { generateInitialPassword } from "@/lib/auth/password";
import { validatePassword } from "@/lib/auth/validation";

describe("generateInitialPassword", () => {
  it("returns a string", () => {
    const pw = generateInitialPassword();
    expect(typeof pw).toBe("string");
  });

  it("generates a password that passes validatePassword", () => {
    const pw = generateInitialPassword();
    expect(validatePassword(pw)).toBeNull();
  });

  it("generates unique passwords on successive calls", () => {
    const passwords = new Set(Array.from({ length: 20 }, () => generateInitialPassword()));
    expect(passwords.size).toBeGreaterThan(1);
  });

  it("generates a password of at least 12 characters", () => {
    const pw = generateInitialPassword();
    expect(pw.length).toBeGreaterThanOrEqual(12);
  });
});
