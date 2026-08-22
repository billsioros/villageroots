import { describe, expect, it } from "vitest";
import { resolveOcrTimeoutMs } from "@/lib/ocr/config";

describe("resolveOcrTimeoutMs", () => {
  it("defaults to 3 minutes when unset", () => {
    expect(resolveOcrTimeoutMs({})).toBe(180_000);
  });

  it("uses a valid numeric override", () => {
    expect(resolveOcrTimeoutMs({ OPENROUTER_TIMEOUT_MS: "90000" })).toBe(90_000);
  });

  it("falls back on non-numeric, zero, or negative values", () => {
    expect(resolveOcrTimeoutMs({ OPENROUTER_TIMEOUT_MS: "abc" })).toBe(180_000);
    expect(resolveOcrTimeoutMs({ OPENROUTER_TIMEOUT_MS: "0" })).toBe(180_000);
    expect(resolveOcrTimeoutMs({ OPENROUTER_TIMEOUT_MS: "-5000" })).toBe(180_000);
  });
});
