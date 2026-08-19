import { TYPE_META, VERB_KIND } from "@/lib/graph/helpers";
import type { NodeRow, EdgeRow } from "@/drizzle/schema";
import type { GraphNode, GraphEdge } from "@/lib/graph/types";

export function nodeRowToGraph(row: NodeRow): GraphNode {
  const props = row.properties ?? {};
  const x = typeof props.x === "number" ? props.x : 0;
  const y = typeof props.y === "number" ? props.y : 0;
  return {
    id: row.slug ?? row.id,
    type: row.type,
    label: row.label,
    subtitle: row.subtitle ?? "",
    description: row.description ?? "",
    color: TYPE_META[row.type].color,
    mark: TYPE_META[row.type].glyph,
    x,
    y,
    status: row.status,
  };
}

export function edgeRowToGraph(row: EdgeRow): GraphEdge {
  return {
    id: row.slug ?? row.id,
    source: row.sourceSlug ?? row.sourceId,
    target: row.targetSlug ?? row.targetId,
    verb: row.type,
    kind: VERB_KIND[row.type],
  };
}

export function toNodeRow(n: GraphNode): NodeRow {
  return {
    id: "",
    slug: n.id,
    type: n.type,
    label: n.label,
    subtitle: n.subtitle,
    description: n.description,
    properties: { x: n.x, y: n.y },
    status: "pending",
    privacy: "public",
    createdBy: null,
    createdAt: null,
    updatedAt: null,
  } as unknown as NodeRow;
}

export function toEdgeRow(e: GraphEdge): EdgeRow {
  return {
    id: "",
    slug: e.id,
    sourceId: "",
    targetId: "",
    sourceSlug: e.source,
    targetSlug: e.target,
    type: e.verb,
    properties: {},
    status: "pending",
    createdBy: null,
    createdAt: null,
    updatedAt: null,
  } as unknown as EdgeRow;
}
