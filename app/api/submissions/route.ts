import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/graph/db";
import { edges as edgesTable, nodes as nodesTable } from "@/drizzle/schema";
import { sessionUid } from "@/lib/graph/session";
import { isAdminUid } from "@/lib/graph/admin";
import { createNodeValues } from "@/lib/graph/createNode";
import { resolveEdgeEndpoints, validateSubmissionShape } from "@/lib/graph/submissions";
import { type Status } from "@/lib/graph/types";

export async function POST(req: Request) {
  const uid = await sessionUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const shape = validateSubmissionShape(body);
  if (!shape.ok) return NextResponse.json({ error: shape.error }, { status: 400 });

  const draftIds = new Set(shape.value.nodes.map((n) => n.id));
  const slugs = new Set<string>();
  for (const e of shape.value.edges) {
    if (!draftIds.has(e.source)) slugs.add(e.source);
    if (!draftIds.has(e.target)) slugs.add(e.target);
  }

  const slugToId = new Map<string, string>();
  if (slugs.size > 0) {
    const rows = await db
      .select({ id: nodesTable.id, slug: nodesTable.slug })
      .from(nodesTable)
      .where(and(inArray(nodesTable.slug, [...slugs]), eq(nodesTable.status, "approved")));
    for (const r of rows) slugToId.set(r.slug, r.id);
  }

  const resolved = resolveEdgeEndpoints(shape.value.edges, draftIds, slugToId);
  if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: 400 });

  const admin = await isAdminUid(uid);
  const status: Status = admin ? "approved" : "pending";

  const result = await db.transaction(async (tx) => {
    const draftToId = new Map<string, string>();
    for (let i = 0; i < shape.value.nodes.length; i++) {
      const n = shape.value.nodes[i];
      const [row] = await tx
        .insert(nodesTable)
        .values(createNodeValues(n, uid, status, i))
        .returning();
      draftToId.set(n.id, row.id);
    }
    let edgeCount = 0;
    for (const e of resolved.edges) {
      const sourceId = draftToId.get(e.source) ?? e.source;
      const targetId = draftToId.get(e.target) ?? e.target;
      await tx.insert(edgesTable).values({
        slug: `edge-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        sourceId,
        targetId,
        type: e.verb,
        properties: {},
        status,
        createdBy: uid,
      });
      edgeCount++;
    }
    return { nodes: shape.value.nodes.length, edges: edgeCount };
  });

  return NextResponse.json(result, { status: 201 });
}
