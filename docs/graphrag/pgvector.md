# pgvector for GraphRAG (PTDN-55)

## Setup

Migration `supabase/migrations/0013_pgvector.sql` enables the `vector`
extension in the `extensions` schema, creates `node_embeddings` (vector(1024)),
a unique index on `node_id`, an HNSW cosine index, a status index, and the
`match_nodes()` SECURITY DEFINER RPC.

## Indexing

- `idx_node_embeddings_node_id` (unique) — one embedding per node; enables
  idempotent `ON CONFLICT` upserts and deletion on node removal (FK cascade).
- `idx_node_embeddings_hnsw` — `USING hnsw (embedding vector_cosine_ops)`
  with `m=16, ef_construction=64`. HNSW is approximate; tune `ef_search` at
  query time if recall suffers. Set `ef_search` via the RPC's `LIMIT` +
  threshold rather than a global setting for now.

## RLS / access boundary

`node_embeddings` grants nothing to `authenticated` or `anon`. It is only
reachable by the server-side service role via `lib/graph/db.ts`. Vector
retrieval happens through `match_nodes()`, which is SECURITY DEFINER and
therefore not subject to per-row RLS — access control for chat lives in the
Next.js route (session + admin checks + the `filter_type`/threshold
parameters). Do not grant SELECT to end-user roles on this table.

## Backup & capacity

`node_embeddings` follows the standard Supabase Postgres backup policy (the
table is plain relational data — HNSW indexes rebuild on restore). Estimate:
~1024 float32 values ≈ 4 KB payload per row plus index overhead. At the
current graph scale (hundreds of nodes) storage is negligible; budget ~1 MB
per ~100 nodes. The HNSW index rebuilds automatically on `db reset`/restore
and does not require a separate backup step. Monitor `node_embeddings.status`
distribution (`embedded` vs `failed`) to gauge ingestion health; a rise in
`failed` rows triggers the retry endpoint.

## Integration contract

- **Ingestion (PTDN-31):** `ingestEmbedding(nodeId)` reads
  `nodes(label, description, document_content)`, hashes the flattened text,
  skips if unchanged, embeds via OpenRouter, and upserts on `node_id`.
  Triggered on node approval.
- **Query (PTDN-32):** `matchNodesByVector(embedding, { matchCount, threshold,
  filterType })` calls `match_nodes()`; the route then fetches 1-hop approved
  neighbors and synthesizes an answer. Both sides treat the embedding model
  (`nvidia/nemotron-3-embed-1b:free`, 1024-dim) as a shared contract.
