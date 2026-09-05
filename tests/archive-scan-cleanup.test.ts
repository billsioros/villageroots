import { describe, expect, it } from "vitest";
import {
  chunk,
  filterExpired,
  type CleanableFile,
} from "../supabase/functions/archive-scan-cleanup/cleanup";

const HOUR = 60 * 60 * 1000;
const now = new Date("2026-09-04T12:00:00.000Z").getTime();

describe("filterExpired", () => {
  const file = (name: string, createdAt?: string | null): CleanableFile => ({
    name,
    createdAt,
  });

  it("keeps files older than the TTL", () => {
    const files = [file("u1/old.png", new Date(now - 25 * HOUR).toISOString())];
    expect(filterExpired(files, 24 * HOUR, now)).toEqual(["u1/old.png"]);
  });

  it("drops files younger than the TTL", () => {
    const files = [file("u1/new.png", new Date(now - 23 * HOUR).toISOString())];
    expect(filterExpired(files, 24 * HOUR, now)).toEqual([]);
  });

  it("treats an object exactly at the TTL as not expired", () => {
    const files = [file("u1/edge.png", new Date(now - 24 * HOUR).toISOString())];
    expect(filterExpired(files, 24 * HOUR, now)).toEqual([]);
  });

  it("drops files without a createdAt", () => {
    const files = [file("u1/null.png", null), file("u1/undef.png", undefined)];
    expect(filterExpired(files, 24 * HOUR, now)).toEqual([]);
  });

  it("drops files with an unparseable createdAt", () => {
    expect(filterExpired([file("u1/garbage.png", "not-a-date")], 24 * HOUR, now)).toEqual([]);
  });
});

describe("chunk", () => {
  it("returns [] for empty input", () => {
    expect(chunk([], 3)).toEqual([]);
  });

  it("splits into exact multiples", () => {
    expect(chunk([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it("keeps the remainder in a final smaller chunk", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("rejects non-positive chunk sizes", () => {
    expect(() => chunk([1], 0)).toThrow(RangeError);
  });
});
