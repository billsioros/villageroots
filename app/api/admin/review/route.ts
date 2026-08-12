import { NextRequest, NextResponse } from "next/server";
import { eq, count } from "drizzle-orm";
import { db } from "@/lib/graph/db";
import { nodes } from "@/drizzle/schema";
import { sessionUid } from "@/lib/graph/session";
import { isAdminUid } from "@/lib/graph/admin";

type QueueType = "nodes" | "edges" | "scan_uploads";

const TABLE_BY_TYPE: Record<QueueType, typeof nodes> = {
  nodes,
  edges: undefined as unknown as typeof nodes,
  scan_uploads: undefined as unknown as typeof nodes,
};

export async function GET(request: NextRequest) {
  const type = (request.nextUrl.searchParams.get("type") ?? "nodes") as QueueType;
  const uid = await sessionUid();
  if (!uid || !(await isAdminUid(uid))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const table = TABLE_BY_TYPE[type];
  if (!table) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const items = await db
    .select({ id: table.id, slug: table.slug, status: table.status })
    .from(table)
    .where(eq((table as { status: typeof nodes.status }).status, "pending"));
  const counts = await db.select({ value: count() }).from(table);
  return NextResponse.json({ items, counts: { [type]: counts[0]?.value ?? 0 } });
}
