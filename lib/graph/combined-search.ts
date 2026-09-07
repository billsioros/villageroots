import { and, or, eq, sql } from "drizzle-orm";
import { db } from "./db";
import { edges, nodes } from "@/drizzle/schema";

export interface MatchNode {
  nodeId: string;
  label: string;
  nodeType: string | null;
  similarity: number;
  contentHash: string;
}

export interface OneHop {
  edgeId: string;
  sourceId: string;
  targetId: string;
  verb: string;
  neighborLabel: string;
  neighborType: string | null;
}

interface MatchRow {
  node_id: string;
  label: string;
  node_type: string | null;
  similarity: number;
  content_hash: string;
}

interface OneHopRow {
  edgeId: string;
  sourceId: string;
  targetId: string;
  verb: string;
  sourceLabel: string | null;
  sourceType: string | null;
  targetLabel: string | null;
  targetType: string | null;
}

export async function matchNodesByVector(
  queryEmbedding: number[],
  opts: { matchCount?: number; threshold?: number; filterType?: string | null } = {},
): Promise<MatchNode[]> {
  const matchCount = opts.matchCount ?? 5;
  const threshold = opts.threshold ?? 0.3;
  const filterType = opts.filterType ?? null;

  const rows = (await db.execute(
    sql`SELECT * FROM public.match_nodes(
      ${JSON.stringify(queryEmbedding) as unknown as string}::extensions.vector,
      ${matchCount},
      ${threshold},
      ${filterType}
    )`,
  )) as unknown as MatchRow[];

  return rows.map((r) => ({
    nodeId: r.node_id,
    label: r.label,
    nodeType: r.node_type,
    similarity: r.similarity,
    contentHash: r.content_hash,
  }));
}

export async function fetchOneHopNeighbors(nodeIds: string[]): Promise<OneHop[]> {
  if (nodeIds.length === 0) return [];
  const wanted = new Set(nodeIds);
  const rows = (await db
    .select({
      edgeId: edges.id,
      sourceId: edges.sourceId,
      targetId: edges.targetId,
      verb: edges.type,
      sourceLabel: nodes.label,
      sourceType: nodes.type,
    })
    .from(edges)
    .innerJoin(nodes, eq(nodes.id, edges.sourceId))
    .where(
      and(
        eq(edges.status, "approved"),
        or(
          sql`${edges.sourceId} = ANY(${nodeIds}::uuid[])`,
          sql`${edges.targetId} = ANY(${nodeIds}::uuid[])`,
        ),
      ),
    )
    .limit(100)) as unknown as OneHopRow[];

  const neighbors = await db
    .select({ id: nodes.id, label: nodes.label, type: nodes.type })
    .from(nodes)
    .where(sql`${nodes.id} = ANY(${nodeIds}::uuid[])`)
    .then((rows) => new Map(rows.map((r) => [r.id, r])));

  const out: OneHop[] = [];
  for (const r of rows) {
    const sourceIn = wanted.has(r.sourceId);
    const targetIn = wanted.has(r.targetId);
    let neighborId: string;
    if (sourceIn && targetIn) {
      continue;
    }
    neighborId = sourceIn ? r.targetId : r.sourceId;
    const neighbor = neighbors.get(neighborId);
    out.push({
      edgeId: r.edgeId,
      sourceId: r.sourceId,
      targetId: r.targetId,
      verb: r.verb,
      neighborLabel: neighbor?.label ?? "",
      neighborType: neighbor?.type ?? null,
    });
  }
  return out;
}
