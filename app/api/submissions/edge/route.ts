import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/graph/db";
import { edges as edgesTable, nodes as nodesTable, notifications, userRoles } from "@/drizzle/schema";
import { sessionUid } from "@/lib/graph/session";
import { isAdminUid } from "@/lib/graph/admin";
import { VERBS } from "@/lib/graph/helpers";
import type { Verb, Status } from "@/lib/graph/types";

export async function POST(req: Request) {
  const uid = await sessionUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  if (typeof b.sourceId !== "string" || typeof b.targetId !== "string" || typeof b.verb !== "string") {
    return NextResponse.json({ error: "sourceId, targetId, and verb are required" }, { status: 400 });
  }
  if (!VERBS.includes(b.verb as Verb)) {
    return NextResponse.json({ error: `Unknown verb: ${b.verb}` }, { status: 400 });
  }
  if (b.sourceId === b.targetId) {
    return NextResponse.json({ error: "A connection cannot link a node to itself" }, { status: 400 });
  }

  const sourceId = b.sourceId;
  const targetId = b.targetId;
  const verb = b.verb as Verb;

  const [sourceRow] = await db
    .select({ id: nodesTable.id })
    .from(nodesTable)
    .where(and(eq(nodesTable.id, sourceId), eq(nodesTable.status, "approved")))
    .limit(1);
  if (!sourceRow) return NextResponse.json({ error: "Source node not found" }, { status: 400 });

  const [targetRow] = await db
    .select({ id: nodesTable.id })
    .from(nodesTable)
    .where(and(eq(nodesTable.id, targetId), eq(nodesTable.status, "approved")))
    .limit(1);
  if (!targetRow) return NextResponse.json({ error: "Target node not found" }, { status: 400 });

  const [existing] = await db
    .select({ id: edgesTable.id })
    .from(edgesTable)
    .where(
      and(
        eq(edgesTable.sourceId, sourceId),
        eq(edgesTable.targetId, targetId),
        eq(edgesTable.type, verb),
        ne(edgesTable.status, "rejected"),
      ),
    )
    .limit(1);
  if (existing) return NextResponse.json({ error: "This connection already exists" }, { status: 409 });

  const admin = await isAdminUid(uid);
  const status: Status = admin ? "approved" : "pending";

  let result;
  try {
    const [row] = await db
      .insert(edgesTable)
      .values({
        slug: `edge-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        sourceId,
        targetId,
        type: verb,
        properties: {},
        status,
        createdBy: uid,
      })
      .returning();
    result = { id: row.id, status };
  } catch {
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }

  if (status === "pending") {
    const admins = await db
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .where(eq(userRoles.role, "admin"));

    for (const { userId } of admins) {
      await db.insert(notifications).values({
        userId,
        type: "submission_pending",
        message: `New edge submission awaiting review: ${verb.replace(/_/g, " ")}`,
        metadata: { edge_id: result.id },
      });
    }
  }

  return NextResponse.json(result, { status: 201 });
}
