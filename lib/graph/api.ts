import type { NodeRow, EdgeRow } from "@/drizzle/schema";

export const PAGE_NODES = 500;
export const PAGE_EDGES = 1000;
export const MAX_GRAPH_NODES = 2000;
export const MAX_GRAPH_EDGES = 4000;

export interface FetchPageParams {
  limit?: number;
  offset?: number;
}

export async function fetchGraphNodes({ limit = PAGE_NODES, offset = 0 }: FetchPageParams = {}): Promise<NodeRow[]> {
  const res = await fetch(`/api/graph/nodes?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error(`Failed to load nodes (${res.status})`);
  return res.json();
}

export async function fetchGraphEdges({ limit = PAGE_EDGES, offset = 0 }: FetchPageParams = {}): Promise<EdgeRow[]> {
  const res = await fetch(`/api/graph/edges?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error(`Failed to load edges (${res.status})`);
  return res.json();
}

// Batching strategy for large graphs:
// The route handlers page by limit/offset. We walk pages of PAGE_NODES
// (500) nodes / PAGE_EDGES (1000) edges, stopping on a short page or when
// we hit MAX_GRAPH_NODES / MAX_GRAPH_EDGES (safety cap so a runaway graph
// cannot blow up the client). React Query caches the flat result; the store
// normalizes it into nodesMap. Pagination for *rendering* beyond the cap is
// future work (graph is capped at ~2000 nodes for PTDN-4).
export async function fetchAllNodes(): Promise<NodeRow[]> {
  const out: NodeRow[] = [];
  let offset = 0;
  for (;;) {
    const page = await fetchGraphNodes({ limit: PAGE_NODES, offset });
    out.push(...page);
    if (page.length < PAGE_NODES || out.length >= MAX_GRAPH_NODES) break;
    offset += PAGE_NODES;
  }
  return out;
}

export async function fetchAllEdges(): Promise<EdgeRow[]> {
  const out: EdgeRow[] = [];
  let offset = 0;
  for (;;) {
    const page = await fetchGraphEdges({ limit: PAGE_EDGES, offset });
    out.push(...page);
    if (page.length < PAGE_EDGES || out.length >= MAX_GRAPH_EDGES) break;
    offset += PAGE_EDGES;
  }
  return out;
}
