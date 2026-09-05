import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

const migration = readFileSync(
  new URL("../supabase/migrations/0012_search_trigram.sql", import.meta.url),
  "utf8",
);

describe("0012_search_trigram.sql", () => {
  it("enables pg_trgm", () => {
    expect(migration).toContain("CREATE EXTENSION IF NOT EXISTS pg_trgm");
  });

  it("drops the legacy FTS trigger, function, index, and column from 0005", () => {
    expect(migration).toContain('DROP TRIGGER IF EXISTS "nodes_search_vector_trigger" ON "nodes"');
    expect(migration).toContain('DROP FUNCTION IF EXISTS "nodes_search_vector_update"()');
    expect(migration).toContain('DROP INDEX IF EXISTS "nodes_search_idx"');
    expect(migration).toContain("DROP COLUMN IF EXISTS search_vector");
  });

  it("creates a trigram GIN expression index over the searchable fields", () => {
    expect(migration).toContain("CREATE INDEX");
    expect(migration).toContain("nodes_search_trgm_idx");
    expect(migration).toContain("gin_trgm_ops");
    expect(migration).toMatch(/coalesce\(label,\s*''\)/);
    expect(migration).toMatch(/coalesce\(subtitle,\s*''\)/);
    expect(migration).toMatch(/coalesce\(description,\s*''\)/);
  });
});
