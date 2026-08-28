import { describe, expect, it } from "vitest";
import { clanColor } from "@/lib/graph/helpers";

describe("clanColor", () => {
  it("returns the same color for the same family id", () => {
    expect(clanColor("f-katsaris")).toBe(clanColor("f-katsaris"));
    expect(clanColor("f-vasiliou")).toBe(clanColor("f-vasiliou"));
  });

  it("returns distinct colors for distinct clans", () => {
    expect(clanColor("f-katsaris")).not.toBe(clanColor("f-vasiliou"));
  });

  it("returns a valid hex color", () => {
    expect(clanColor("f-katsaris")).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
