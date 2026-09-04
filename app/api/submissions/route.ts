import { NextResponse } from "next/server";
import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "@/lib/graph/db";
import { edges as edgesTable, nodes as nodesTable, notifications, userRoles } from "@/drizzle/schema";
import { sessionUid } from "@/lib/graph/session";
import { isAdminUid } from "@/lib/graph/admin";
import { createNodeValues } from "@/lib/graph/createNode";
import { resolveEdgeEndpoints, validateSubmissionShape } from "@/lib/graph/submissions";
import { logAudit } from "@/lib/graph/audit";
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

  for (const n of shape.value.nodes) {
    const size = n.documentContent ? JSON.stringify(n.documentContent).length : 0;
    if (size > 1_000_000) {
      return NextResponse.json({ error: "documentContent too large" }, { status: 400 });
    }
  }

  const draftIds = new Set(shape.value.nodes.map((n) => n.id));
  const slugs = new Set<string>();
  for (const e of shape.value.edges) {
    if (!draftIds.has(e.source)) slugs.add(e.source);
    if (!draftIds.has(e.target)) slugs.add(e.target);
  }

  const slugToId = new Map<string, string>();
  if (slugs.size > 0) {
    const rows = await db
      .select({ id: nodesTable.id, slug: nodesTable.slug, createdBy: nodesTable.createdBy, status: nodesTable.status })
      .from(nodesTable)
      .where(and(inArray(nodesTable.slug, [...slugs]), or(eq(nodesTable.status, "approved"), eq(nodesTable.createdBy, uid))));
    for (const r of rows) {
      if (r.status === "approved" || r.createdBy === uid) slugToId.set(r.slug, r.id);
    }
  }

  const resolved = resolveEdgeEndpoints(shape.value.edges, draftIds, slugToId);
  if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: 400 });

  const admin = await isAdminUid(uid);
  const status: Status = admin ? "approved" : "pending";

  let result;
  const auditEntries: { entityType: "node" | "edge"; entitySlug: string; metadata: Record<string, unknown> }[] = [];
  try {
    result = await db.transaction(async (tx) => {
      const draftToId = new Map<string, string>();
      for (let i = 0; i < shape.value.nodes.length; i++) {
        const n = shape.value.nodes[i];
        const [row] = await tx
          .insert(nodesTable)
          .values(createNodeValues(n, uid, status, i))
          .returning();
        draftToId.set(n.id, row.id);
        auditEntries.push({ entityType: "node", entitySlug: row.slug, metadata: { label: n.label } });
      }
      let edgeCount = 0;
      for (const e of resolved.edges) {
        const sourceId = draftToId.get(e.source) ?? e.source;
        const targetId = draftToId.get(e.target) ?? e.target;
        const edgeSlug = `edge-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        await tx.insert(edgesTable).values({
          slug: edgeSlug,
          sourceId,
          targetId,
          type: e.verb,
          properties: {},
          status,
          createdBy: uid,
        });
        auditEntries.push({ entityType: "edge", entitySlug: edgeSlug, metadata: {} });
        edgeCount++;
      }
      return { nodes: shape.value.nodes.length, edges: edgeCount };
    });
  } catch (e) {
    console.error("SUBMISSION_TX_ERROR", e);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }

  for (const entry of auditEntries) {
    await logAudit("create", entry.entityType, entry.entitySlug, entry.metadata);
  }

  // Notify admins about pending submission
  if (status === "pending") {
    const admins = await db
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .where(eq(userRoles.role, "admin"));

    const nodeCount = shape.value.nodes.length;
    const edgeCount = resolved.edges.length;
    const parts: string[] = [];
    if (nodeCount) parts.push(`${nodeCount} node${nodeCount > 1 ? "s" : ""}`);
    if (edgeCount) parts.push(`${edgeCount} connection${edgeCount > 1 ? "s" : ""}`);
    const summary = parts.join(" and ") || "new submission";

    for (const { userId } of admins) {
      await db.insert(notifications).values({
        userId,
        type: "submission_pending",
        message: `New submission awaiting review: ${summary}`,
        metadata: { node_count: nodeCount, edge_count: edgeCount },
      });
    }
  }

  return NextResponse.json(result, { status: 201 });
}
