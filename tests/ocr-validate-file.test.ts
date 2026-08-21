import { describe, expect, it } from "vitest";
import { SCAN_MAX_BYTES, validateScanFile } from "@/lib/ocr/validate-file";

const file = (name: string, type: string, size = 100) =>
  new File([new Uint8Array(size)], name, { type });

describe("validateScanFile", () => {
  it("accepts a jpg/png/webp within the size cap", () => {
    expect(validateScanFile(file("scan.jpg", "image/jpeg"))).toBeNull();
    expect(validateScanFile(file("scan.jpeg", "image/jpeg"))).toBeNull();
    expect(validateScanFile(file("scan.png", "image/png"))).toBeNull();
    expect(validateScanFile(file("scan.webp", "image/webp"))).toBeNull();
  });

  it("rejects disallowed extensions", () => {
    expect(validateScanFile(file("scan.pdf", "application/pdf"))).toMatch(/under 10MB/);
    expect(validateScanFile(file("scan.gif", "image/gif"))).toMatch(/under 10MB/);
    expect(validateScanFile(file("noext", ""))).toMatch(/under 10MB/);
  });

  it("rejects mismatched mime types", () => {
    expect(validateScanFile(file("scan.png", "image/jpeg"))).toMatch(/under 10MB/);
  });

  it("rejects oversized files", () => {
    expect(validateScanFile(file("scan.jpg", "image/jpeg", SCAN_MAX_BYTES + 1))).toMatch(
      /under 10MB/,
    );
  });
});
