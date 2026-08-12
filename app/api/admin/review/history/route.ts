import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/graph/db";
import { moderations } from "@/drizzle/schema";
import { sessionUid } from "@/lib/graph/session";
import { isAdminUid } from "@/lib/graph/admin";

type ModerationsItemType = (typeof moderations.$inferSelect)["itemType"];

export async function GET(request: NextRequest) {
  const uid = await sessionUid();
  if (!uid || !(await isAdminUid(uid))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const type = request.nextUrl.searchParams.get("type");
  const id = request.nextUrl.searchParams.get("id");
  if (!type || !id) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const itemType = type as ModerationsItemType;
  const rows = await db
    .select({
      id: moderations.id,
      action: moderations.action,
      reason: moderations.reason,
      moderatedBy: moderations.moderatedBy,
      createdAt: moderations.createdAt,
    })
    .from(moderations)
    .where(and(eq(moderations.itemType, itemType), eq(moderations.itemId, id)))
    .orderBy(moderations.createdAt);
  return NextResponse.json(rows);
}
