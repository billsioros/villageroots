import type { Citation, Subgraph } from "./types";
import type { OneHop } from "./combined-search";

export const LOW_RELEVANCE_THRESHOLD = 0.5;

export type { OneHop } from "./combined-search";

export interface CitationPool {
  retrieved: Citation[];
  neighbors: Citation[];
}

const MARKER =
  /\[([^\]]+)\]\(([a-zA-Z0-9-]{2,})\)|(?:<<?|\[|\b)CITE\s*:\s*(\d+)(?:>>?|\]|\b)|\[(\d+)\]/gi;

const ESCAPED_TAG = /&(?:lt|gt|#60|#62|#x3[cCeE]|#X3[CcEe]);/g;
const UNESCAPE = (match: string) => (/lt|#60|#x3[cC]/.test(match) ? "<" : ">");

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

  const cite = (citation: Citation) => {
    if (!indexOf.has(citation.nodeId)) {
      indexOf.set(citation.nodeId, order.length);
      order.push(citation);
    }
    return `[${indexOf.get(citation.nodeId)! + 1}]`;
  };

  const text = answer.replace(ESCAPED_TAG, UNESCAPE).replace(
    MARKER,
    (match: string, _label: string, nodeId: string, citeN: string, bracketN: string) => {
      if (nodeId) {
        const citation = byId.get(nodeId);
        return citation ? cite(citation) : match;
      }
      if (citeN) {
        const citation = pools.retrieved[Number(citeN) - 1];
        return citation ? cite(citation) : `[${citeN}]`;
      }
      if (bracketN) {
        const citation = pools.retrieved[Number(bracketN) - 1];
        return citation ? cite(citation) : match;
      }
      return match;
    },
  );

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
