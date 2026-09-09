import { and, or, eq, sql, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "./db";
import { edges, nodes } from "@/drizzle/schema";
import { richTextToText } from "./rich-text-to-text";

/**
 * The client graph (store, canvas, mappers) is keyed by node/edge SLUG, not
 * uuid. Every id this module returns is therefore a slug so downstream
 * consumers (citations, subgraph focus, litPath) resolve against the canvas.
 */
export interface MatchNode {
  /** Canvas id (slug). Mirrors `slug`. */
  nodeId: string;
  slug: string;
  label: string;
  nodeType: string | null;
  similarity: number;
  contentHash: string;
}

export interface OneHop {
  /** Canvas ids (slugs). */
  edgeId: string;
  sourceId: string;
  targetId: string;
  verb: string;
  neighborLabel: string;
  neighborType: string | null;
}

interface MatchRow {
  node_id: string;
  node_slug?: string;
  label: string;
  node_type: string | null;
  similarity: number;
  content_hash: string;
}

interface OneHopRow {
  edgeId: string;
  edgeSlug: string;
  sourceId: string;
  sourceSlug: string;
  targetId: string;
  targetSlug: string;
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
    sql`SELECT m.node_id, m.label, m.node_type, m.similarity, m.content_hash, n.slug AS node_slug
    FROM public.match_nodes(
      ${JSON.stringify(queryEmbedding) as unknown as string}::extensions.vector,
      ${matchCount},
      ${threshold},
      ${filterType}
    ) AS m
    JOIN public.nodes n ON n.id = m.node_id`,
  )) as unknown as MatchRow[];

  return rows.map((r) => ({
    nodeId: r.node_slug ?? r.node_id,
    slug: r.node_slug ?? r.node_id,
    label: r.label,
    nodeType: r.node_type,
    similarity: r.similarity,
    contentHash: r.content_hash,
  }));
}

export async function fetchNodeBodies(nodeIds: string[]): Promise<Record<string, string>> {
  if (nodeIds.length === 0) return {};
  const rows = await db
    .select({ id: nodes.id, slug: nodes.slug, description: nodes.description, documentContent: nodes.documentContent })
    .from(nodes)
    .where(inArray(nodes.slug, nodeIds));
  const out: Record<string, string> = {};
  for (const r of rows) {
    const docText = r.documentContent ? richTextToText(r.documentContent) : "";
    const text = [r.description, docText].filter((p) => p?.trim()).join("\n").trim();
    if (text) out[r.slug ?? r.id] = text;
  }
  return out;
}

export async function fetchOneHopNeighbors(nodeIds: string[]): Promise<OneHop[]> {
  if (nodeIds.length === 0) return [];
  const wanted = new Set(nodeIds);
  const srcNodes = alias(nodes, "src_nodes");
  const tgtNodes = alias(nodes, "tgt_nodes");
  // nodeIds are slugs (canvas ids), so filter on the slug columns of both
  // endpoints and select their labels/types directly from the joins.
  const rows = (await db
    .select({
      edgeId: edges.id,
      edgeSlug: edges.slug,
      sourceId: edges.sourceId,
      sourceSlug: srcNodes.slug,
      targetId: edges.targetId,
      targetSlug: tgtNodes.slug,
      verb: edges.type,
      sourceLabel: srcNodes.label,
      sourceType: srcNodes.type,
      targetLabel: tgtNodes.label,
      targetType: tgtNodes.type,
    })
    .from(edges)
    .innerJoin(srcNodes, eq(srcNodes.id, edges.sourceId))
    .innerJoin(tgtNodes, eq(tgtNodes.id, edges.targetId))
    .where(
      and(
        eq(edges.status, "approved"),
        or(inArray(srcNodes.slug, nodeIds), inArray(tgtNodes.slug, nodeIds)),
      ),
    )
    .limit(100)) as unknown as OneHopRow[];

  const out: OneHop[] = [];
  for (const r of rows) {
    const sourceIn = wanted.has(r.sourceSlug);
    const targetIn = wanted.has(r.targetSlug);
    if (sourceIn && targetIn) {
      continue;
    }
    const isSource = sourceIn;
    const sourceId = r.sourceSlug ?? r.sourceId;
    const targetId = r.targetSlug ?? r.targetId;
    out.push({
      edgeId: r.edgeSlug ?? r.edgeId,
      sourceId,
      targetId,
      verb: r.verb,
      neighborLabel: (isSource ? r.targetLabel : r.sourceLabel) ?? "",
      neighborType: (isSource ? r.targetType : r.sourceType) ?? null,
    });
  }
  return out;
}
