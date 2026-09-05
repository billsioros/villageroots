import { NextResponse } from "next/server";
import { eq, and, desc, count as drizzleCount } from "drizzle-orm";
import { db } from "@/lib/graph/db";
import { notifications } from "@/drizzle/schema";
import { sessionUid } from "@/lib/graph/session";

export async function GET() {
  const uid = await sessionUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, uid))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  const [{ value: unreadCount }] = await db
    .select({ value: drizzleCount() })
    .from(notifications)
    .where(and(eq(notifications.userId, uid), eq(notifications.read, false)));

  return NextResponse.json({ notifications: rows, unreadCount });
}

export async function DELETE() {
  const uid = await sessionUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .delete(notifications)
    .where(and(eq(notifications.userId, uid), eq(notifications.read, true)))
    .returning({ id: notifications.id });

  return NextResponse.json({ ok: true, deleted: rows.length });
}

export async function PATCH() {
  const uid = await sessionUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.userId, uid), eq(notifications.read, false)))
    .returning({ id: notifications.id });

  return NextResponse.json({ ok: true, updated: rows.length });
}
