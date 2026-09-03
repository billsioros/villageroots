import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/graph/db";
import { nodes, edges, scanUploads, moderations, notifications } from "@/drizzle/schema";
import { sessionUid } from "@/lib/graph/session";
import { isAdminUid } from "@/lib/graph/admin";
import { applyModeration, type ModerationAction } from "@/lib/graph/moderation";
import { logAudit } from "@/lib/graph/audit";
import type { Status } from "@/lib/graph/types";

const TABLE = {
  nodes: { table: nodes, status: nodes.status, createdBy: nodes.createdBy },
  edges: { table: edges, status: edges.status, createdBy: edges.createdBy },
  scan_uploads: { table: scanUploads, status: scanUploads.status, createdBy: scanUploads.createdBy },
} as const;

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ type: string; id: string }> },
) {
  const uid = await sessionUid();
  if (!uid || !(await isAdminUid(uid))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { type, id } = await ctx.params;
  const target = TABLE[type as keyof typeof TABLE];
  if (!target) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  let body: { action?: ModerationAction; reason?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Bad body" }, { status: 400 }); }
  const action = body.action;
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Bad action" }, { status: 400 });
  }

  const current = await db
    .select({ status: target.status, createdBy: target.createdBy })
    .from(target.table)
    .where(eq(target.table.id, id))
    .limit(1);
  if (current.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { status, changed } = applyModeration(
    { status: current[0].status as Status },
    action,
  );

  const result = await db.transaction(async (tx) => {
    if (changed) {
      await tx.update(target.table)
        .set({ status })
        .where(eq(target.table.id, id));
    }
    await tx.insert(moderations).values({
      itemType: type as "nodes" | "edges" | "scan_uploads",
      itemId: id,
      action: action === "approve" ? "approved" : "rejected",
      reason: body.reason ?? null,
      moderatedBy: uid,
    });

    // Create notification for the submitter (all three tables have createdBy)
    const ownerId = current[0]?.createdBy as string | null;

    if (ownerId && ownerId !== uid) {
      const message = action === "approve"
        ? "Your submission was approved and is now live on the graph"
        : body.reason
          ? `Your submission was not approved: ${body.reason}`
          : "Your submission was not approved";
      await tx.insert(notifications).values({
        userId: ownerId,
        type: action === "approve" ? "submission_approved" : "submission_rejected",
        message,
        metadata: { submission_id: id, node_count: 1 },
      });
    }

    if (changed) {
      const entityType = type === "nodes" ? "node" : type === "edges" ? "edge" : null;
      if (entityType) {
        await logAudit("status_change", entityType, id, {
          statusBefore: current[0].status as string,
          statusAfter: status,
        }, tx);
      }
    }

    return { id, status };
  });

  return NextResponse.json(result);
}
