import { type DraftEdge, type DraftNode, type NodeType, type Verb } from "@/lib/graph/types";
import { VERBS } from "@/lib/graph/helpers";

export const MAX_SUBMISSION_NODES = 20;
export const MAX_SUBMISSION_EDGES = 50;
export const MAX_FIELD_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 10000;
export const MAX_FACT_LENGTH = 1000;

export const NODE_TYPES = ["person", "family", "landmark", "toponym", "event", "path"] as const satisfies readonly NodeType[];

export interface SubmissionNode {
  id: string;
  type: NodeType;
  label: string;
  subtitle: string | null;
  description: string | null;
  documentContent?: Record<string, unknown> | null;
  facts?: Record<string, string> | null;
  deceased?: boolean | null;
  x?: number | null;
  y?: number | null;
}

export interface SubmissionEdge {
  source: string;
  target: string;
  verb: Verb;
}

export interface SubmissionPayload {
  nodes: SubmissionNode[];
  edges: SubmissionEdge[];
}

export function validateSubmissionShape(
  body: unknown,
): { ok: true; value: SubmissionPayload } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) return { ok: false, error: "Invalid body" };
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.nodes)) return { ok: false, error: "nodes is required" };
  const edges = Array.isArray(b.edges) ? (b.edges as unknown[]) : [];
  if (b.nodes.length === 0) return { ok: false, error: "Add at least one node" };
  if (b.nodes.length > MAX_SUBMISSION_NODES) return { ok: false, error: `Too many nodes (max ${MAX_SUBMISSION_NODES})` };
  if (edges.length > MAX_SUBMISSION_EDGES) return { ok: false, error: `Too many connections (max ${MAX_SUBMISSION_EDGES})` };

  const seenIds = new Set<string>();
  const nodes: SubmissionNode[] = [];
  for (const raw of b.nodes) {
    const n = raw as Record<string, unknown>;
    if (typeof n?.id !== "string" || n.id.length === 0) return { ok: false, error: "Each node needs an id" };
    if (seenIds.has(n.id)) return { ok: false, error: "Duplicate node id" };
    seenIds.add(n.id);
    if (!NODE_TYPES.includes(n.type as NodeType)) return { ok: false, error: `Unknown node type: ${String(n.type)}` };
    if (typeof n.label !== "string" || n.label.trim().length === 0) return { ok: false, error: "Each node needs a label" };
    if (n.label.length > MAX_FIELD_LENGTH) return { ok: false, error: `Label too long (max ${MAX_FIELD_LENGTH})` };
    if (typeof n.subtitle === "string" && n.subtitle.length > MAX_FIELD_LENGTH) {
      return { ok: false, error: "Subtitle too long" };
    }
    if (typeof n.description === "string" && n.description.length > MAX_DESCRIPTION_LENGTH) {
      return { ok: false, error: "Description too long" };
    }
    let documentContent: Record<string, unknown> | undefined;
    if (n.documentContent !== undefined && n.documentContent !== null) {
      if (typeof n.documentContent !== "object" || Array.isArray(n.documentContent)) {
        return { ok: false, error: "documentContent must be an object" };
      }
      documentContent = n.documentContent as Record<string, unknown>;
    }
    let facts: Record<string, string> | undefined;
    if (n.facts !== undefined && n.facts !== null) {
      if (typeof n.facts !== "object") return { ok: false, error: "facts must be an object" };
      facts = {};
      for (const [k, v] of Object.entries(n.facts as Record<string, unknown>)) {
        if (typeof v !== "string" || v.length > MAX_FACT_LENGTH) {
          return { ok: false, error: `Fact ${k} too long (max ${MAX_FACT_LENGTH})` };
        }
        facts[k] = v;
      }
    }
    nodes.push({
      id: n.id,
      type: n.type as NodeType,
      label: n.label,
      subtitle: typeof n.subtitle === "string" ? n.subtitle : null,
      description: typeof n.description === "string" ? n.description : null,
      documentContent,
      facts,
      deceased: typeof n.deceased === "boolean" ? n.deceased : null,
      x: typeof n.x === "number" ? n.x : null,
      y: typeof n.y === "number" ? n.y : null,
    });
  }

  const seen = new Set<string>();
  const outEdges: SubmissionEdge[] = [];
  for (const raw of edges) {
    const e = raw as Record<string, unknown>;
    if (typeof e.source !== "string" || typeof e.target !== "string") {
      return { ok: false, error: "Connection needs source and target" };
    }
    if (!VERBS.includes(e.verb as Verb)) return { ok: false, error: `Unknown connection type: ${String(e.verb)}` };
    if (e.source === e.target) return { ok: false, error: "A connection cannot link a node to itself" };
    const key = `${e.source}|${e.target}|${e.verb}`;
    if (seen.has(key)) return { ok: false, error: "Duplicate connection" };
    seen.add(key);
    outEdges.push({ source: e.source, target: e.target, verb: e.verb as Verb });
  }

  return { ok: true, value: { nodes, edges: outEdges } };
}

export type ResolvedEdge = { source: string; target: string; verb: Verb };

export function resolveEdgeEndpoints(
  edges: SubmissionEdge[],
  draftIds: Set<string>,
  slugToId: Map<string, string>,
): { ok: true; edges: ResolvedEdge[] } | { ok: false; error: string } {
  const resolved: ResolvedEdge[] = [];
  for (const e of edges) {
    const source = draftIds.has(e.source) ? e.source : slugToId.get(e.source);
    const target = draftIds.has(e.target) ? e.target : slugToId.get(e.target);
    if (!source) return { ok: false, error: `Unknown node: ${e.source}` };
    if (!target) return { ok: false, error: `Unknown node: ${e.target}` };
    if (source === target) return { ok: false, error: "A connection cannot link a node to itself" };
    resolved.push({ source, target, verb: e.verb });
  }
  return { ok: true, edges: resolved };
}

export function submissionPayloadFromDrafts(draftNodes: DraftNode[], draftEdges: DraftEdge[]): SubmissionPayload {
  const seen = new Set<string>();
  const edges: SubmissionEdge[] = [];
  for (const e of draftEdges) {
    const key = `${e.source}|${e.target}|${e.verb}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push({ source: e.source, target: e.target, verb: e.verb });
  }
  return {
    nodes: draftNodes.map((d) => ({
      id: d.id,
      type: d.type,
      label: d.label,
      subtitle: d.subtitle ?? null,
      description: d.description ?? null,
      documentContent: d.documentContent ?? null,
      facts: d.facts ?? null,
      deceased: d.deceased ?? null,
      x: d.x,
      y: d.y,
    })),
    edges,
  };
}
