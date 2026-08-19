-- 0005_search.sql
-- Add tsvector column for full-text search on nodes

ALTER TABLE "nodes" ADD COLUMN search_vector tsvector;

-- GIN index for efficient @@ matching
CREATE INDEX "nodes_search_idx" ON "nodes" USING gin(search_vector);

-- Trigger function to keep search_vector in sync on INSERT/UPDATE
CREATE OR REPLACE FUNCTION "nodes_search_vector_update"() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.label, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.subtitle, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to nodes table
CREATE TRIGGER "nodes_search_vector_trigger"
  BEFORE INSERT OR UPDATE OF label, subtitle, description
  ON "nodes"
  FOR EACH ROW
  EXECUTE FUNCTION "nodes_search_vector_update"();

-- Backfill existing rows by firing the trigger
UPDATE "nodes" SET label = label;
