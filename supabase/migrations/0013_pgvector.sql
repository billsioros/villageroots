-- GraphRAG vector foundation (PTDN-55)
-- Enables the pgvector extension and the node_embeddings table used by the
-- ingestion (PTDN-31) and query (PTDN-32) pipelines.

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO postgres, service_role;--> statement-breakpoint

CREATE TABLE public.node_embeddings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id       uuid NOT NULL REFERENCES public.nodes(id) ON DELETE CASCADE,
  content_hash  text NOT NULL,
  model         text NOT NULL,
  embedding     extensions.vector(2048) NOT NULL,
  dimensions    integer NOT NULL DEFAULT 2048,
  node_type     text,
  label         text,
  status        text NOT NULL DEFAULT 'pending',
  error         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE UNIQUE INDEX idx_node_embeddings_node_id ON public.node_embeddings(node_id);--> statement-breakpoint

CREATE INDEX idx_node_embeddings_hnsw ON public.node_embeddings
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);--> statement-breakpoint

CREATE INDEX idx_node_embeddings_status ON public.node_embeddings(status);--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.match_nodes(
  query_embedding extensions.vector(2048),
  match_count integer DEFAULT 5,
  similarity_threshold double precision DEFAULT 0.3,
  filter_type text DEFAULT NULL
)
RETURNS TABLE (
  node_id uuid,
  label text,
  node_type text,
  similarity double precision,
  content_hash text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ne.node_id,
    ne.label,
    ne.node_type,
    1 - (ne.embedding <=> query_embedding) AS similarity,
    ne.content_hash
  FROM public.node_embeddings ne
  WHERE ne.status = 'embedded'
    AND (filter_type IS NULL OR ne.node_type = filter_type)
    AND 1 - (ne.embedding <=> query_embedding) > similarity_threshold
  ORDER BY ne.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
