import { NextRequest, NextResponse } from "next/server";
import { alias } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";
import { db } from "@/lib/graph/db";
import { edges, nodes } from "@/drizzle/schema";
import { graphPolicy } from "@/lib/graph/policy";
import { sessionUid } from "@/lib/graph/session";

const MAX_LIMIT = 500;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 500), 1), MAX_LIMIT);
  const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);
  const uid = await sessionUid();

  const sourceNodes = alias(nodes, "source_nodes");
  const targetNodes = alias(nodes, "target_nodes");

  const rows = await db
    .select({
      id: edges.id,
      slug: edges.slug,
      sourceId: edges.sourceId,
      targetId: edges.targetId,
      sourceSlug: sourceNodes.slug,
      targetSlug: targetNodes.slug,
      type: edges.type,
      properties: edges.properties,
      status: edges.status,
      createdBy: edges.createdBy,
      createdAt: edges.createdAt,
      updatedAt: edges.updatedAt,
    })
    .from(edges)
    .innerJoin(sourceNodes, eq(sourceNodes.id, edges.sourceId))
    .innerJoin(targetNodes, eq(targetNodes.id, edges.targetId))
    .where(graphPolicy(uid, { status: edges.status, createdBy: edges.createdBy }))
    .orderBy(edges.createdAt)
    .limit(limit)
    .offset(offset);

  return NextResponse.json(rows);
}
