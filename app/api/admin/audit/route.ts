import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, lte, asc } from "drizzle-orm";
import { db } from "@/lib/graph/db";
import { auditLogs, authUsers } from "@/drizzle/schema";
import { sessionUid } from "@/lib/graph/session";
import { isAdminUid } from "@/lib/graph/admin";

export async function GET(request: NextRequest) {
  const uid = await sessionUid();
  if (!uid || !(await isAdminUid(uid))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const sp = request.nextUrl.searchParams;

  const actorId = sp.get("actorId");
  const entityType = sp.get("entityType");
  const entityId = sp.get("entityId");
  const action = sp.get("action");
  const from = sp.get("from");
  const to = sp.get("to");
  const limit = Math.min(Number(sp.get("limit") || 50), 200);
  const offset = Number(sp.get("offset") || 0);

  const conditions = [];
  if (actorId) conditions.push(eq(auditLogs.actorId, actorId));
  if (entityType) conditions.push(eq(auditLogs.entityType, entityType as "node" | "edge"));
  if (entityId) conditions.push(eq(auditLogs.entityId, entityId));
  if (action) conditions.push(eq(auditLogs.action, action as "create" | "update" | "status_change"));
  if (from) conditions.push(gte(auditLogs.createdAt, new Date(from)));
  if (to) conditions.push(lte(auditLogs.createdAt, new Date(to)));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: auditLogs.id,
      actorId: auditLogs.actorId,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      entitySlug: auditLogs.entitySlug,
      action: auditLogs.action,
      statusBefore: auditLogs.statusBefore,
      statusAfter: auditLogs.statusAfter,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
      actorEmail: authUsers.email,
    })
    .from(auditLogs)
    .leftJoin(authUsers, eq(auditLogs.actorId, authUsers.id))
    .where(whereClause)
    .orderBy(asc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ items: rows });
}
