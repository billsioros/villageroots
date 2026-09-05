-- 0012_search_trigram.sql
-- Replace tsvector full-text search with pg_trgm substring search.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Drop the now-unused full-text search column, its index, and trigger
-- (names from 0005_search.sql)
DROP TRIGGER IF EXISTS "nodes_search_vector_trigger" ON "nodes";
DROP FUNCTION IF EXISTS "nodes_search_vector_update"();
DROP INDEX IF EXISTS "nodes_search_idx";
ALTER TABLE "nodes" DROP COLUMN IF EXISTS search_vector;

-- Single trigram GIN index over the concatenated searchable text.
-- NOTE: the route query must reproduce this exact concatenation expression
-- verbatim or Postgres will not use this index.
CREATE INDEX "nodes_search_trgm_idx" ON "nodes"
  USING gin (
    (coalesce(label, '') || ' ' || coalesce(subtitle, '') || ' ' || coalesce(description, ''))
    gin_trgm_ops
  );
