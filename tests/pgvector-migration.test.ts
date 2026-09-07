import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

const migration = readFileSync(
  new URL("../supabase/migrations/0013_pgvector.sql", import.meta.url),
  "utf8",
);

describe("0013_pgvector.sql", () => {
  it("enables the vector extension in the extensions schema", () => {
    expect(migration).toContain("CREATE EXTENSION IF NOT EXISTS vector");
    expect(migration).toMatch(/SCHEMA extensions/);
  });

  it("creates the node_embeddings table with a vector(1024) column", () => {
    expect(migration).toContain("CREATE TABLE public.node_embeddings");
    expect(migration).toContain("vector(1024)");
  });

  it("adds a unique index on node_id for idempotent upserts", () => {
    expect(migration).toContain("CREATE UNIQUE INDEX");
    expect(migration).toMatch(/node_embeddings\s*\(\s*node_id\s*\)/);
  });

  it("creates an HNSW cosine index on the embedding column", () => {
    expect(migration).toContain("USING hnsw");
    expect(migration).toContain("vector_cosine_ops");
  });

  it("defines the match_nodes function with the correct signature", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.match_nodes");
    expect(migration).toContain("vector(1024)");
    expect(migration).toContain("SECURITY DEFINER");
  });
});
