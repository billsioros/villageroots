import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/graph/db";
import { nodes, edges, scanUploads, moderations } from "@/drizzle/schema";
import { sessionUid } from "@/lib/graph/session";
import { isAdminUid } from "@/lib/graph/admin";
import { applyModeration, type ModerationAction } from "@/lib/graph/moderation";
import type { Status } from "@/lib/graph/types";

const TABLE = {
  nodes: { table: nodes, status: nodes.status },
  edges: { table: edges, status: edges.status },
  scan_uploads: { table: scanUploads, status: scanUploads.status },
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
    .select({ status: target.status })
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
    return { id, status };
  });

  return NextResponse.json(result);
}
