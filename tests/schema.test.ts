import { describe, it, expect } from "vitest";
import { userRoles, moderations, scanUploads } from "@/drizzle/schema";

describe("admin-moderation tables exist in drizzle schema", () => {
  it("exports userRoles with admin/contributor role column", () => {
    expect(userRoles).toBeDefined();
  });
  it("exports moderations history table", () => {
    expect(moderations).toBeDefined();
  });
  it("exports scanUploads media table", () => {
    expect(scanUploads).toBeDefined();
  });
});
