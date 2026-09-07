import type { Citation, Subgraph } from "./types";
import type { OneHop } from "./combined-search";

export const LOW_RELEVANCE_THRESHOLD = 0.5;

export type { OneHop } from "./combined-search";

export interface CitationPool {
  retrieved: Citation[];
  neighbors: Citation[];
}

const MARKER = /\[([^\]]+)\]\(([a-zA-Z0-9-]{2,})\)/g;

export function parseCitations(
  answer: string,
  pools: CitationPool,
): { text: string; citations: Citation[] } {
  const byId = new Map<string, Citation>();
  for (const c of pools.retrieved) byId.set(c.nodeId, c);
  for (const c of pools.neighbors) {
    if (!byId.has(c.nodeId)) byId.set(c.nodeId, c);
  }

  const order: Citation[] = [];
  const indexOf = new Map<string, number>();

  let text = answer;
  text = text.replace(MARKER, (match, _label: string, nodeId: string) => {
    const citation = byId.get(nodeId);
    if (!citation) return match;
    if (!indexOf.has(nodeId)) {
      indexOf.set(nodeId, order.length);
      order.push(citation);
    }
    return `[${indexOf.get(nodeId)! + 1}]`;
  });

  return { text, citations: order };
}

export function buildSubgraphFromPath(cited: Citation[], hops: OneHop[]): Subgraph {
  const citedIds = new Set(cited.map((c) => c.nodeId));
  const nodeIds = new Set(citedIds);
  const edgeIds: string[] = [];

  for (const h of hops) {
    if (!citedIds.has(h.sourceId) && !citedIds.has(h.targetId)) continue;
    nodeIds.add(h.sourceId);
    nodeIds.add(h.targetId);
    edgeIds.push(h.edgeId);
  }

  return {
    nodeIds: [...nodeIds],
    edgeIds,
    citedNodeIds: [...citedIds],
  };
}
