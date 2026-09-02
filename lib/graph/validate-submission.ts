import { type DraftNode, type DraftEdge, type Verb } from "@/lib/graph/types";
import {
  MAX_SUBMISSION_NODES,
  MAX_SUBMISSION_EDGES,
  MAX_FIELD_LENGTH,
  MAX_DESCRIPTION_LENGTH,
} from "@/lib/graph/submissions";

interface Connection {
  verb: Verb;
  target: string;
}

export function validateBeforeSubmit(
  draftNodes: DraftNode[],
  draftEdges: DraftEdge[],
  connections: Record<string, Connection[]>,
): string | null {
  if (draftNodes.length === 0) return "Add at least one entry";

  for (const d of draftNodes) {
    if (!d.label || d.label.trim().length === 0) return "All entries must have a name";
    if (d.label.length > MAX_FIELD_LENGTH)
      return "Entry name too long (max 200 characters)";
    if (d.description && d.description.length > MAX_DESCRIPTION_LENGTH)
      return "Description too long (max 10,000 characters)";
  }

  let edgeCount = draftEdges.length;
  const seenEdges = new Set<string>();

  for (const [nodeId, conns] of Object.entries(connections)) {
    for (const conn of conns) {
      if (!conn.target) return "All connections must have a target node";
      if (nodeId === conn.target)
        return "A connection cannot link a node to itself";

      const key = `${nodeId}|${conn.target}|${conn.verb}`;
      if (seenEdges.has(key)) return "Duplicate connection detected";
      seenEdges.add(key);
      edgeCount++;
    }
  }

  if (draftNodes.length > MAX_SUBMISSION_NODES || edgeCount > MAX_SUBMISSION_EDGES)
    return "Too many entries or connections";

  return null;
}
