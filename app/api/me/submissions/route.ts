import { NextRequest, NextResponse } from "next/server";
import { and, eq, ne, desc } from "drizzle-orm";
import { db } from "@/lib/graph/db";
import { nodes, moderations } from "@/drizzle/schema";
import { sessionUid } from "@/lib/graph/session";

type SubmissionItem = {
  id: string;
  slug: string;
  label: string;
  status: "pending" | "approved" | "rejected";
  privacy: "public" | "private";
  createdAt: Date;
  reason: string | null;
};

// request is part of the App Router handler contract but unused here.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  const uid = await sessionUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const subs = await db
    .select({
      id: nodes.id,
      slug: nodes.slug,
      label: nodes.label,
      status: nodes.status,
      privacy: nodes.privacy,
      createdAt: nodes.createdAt,
    })
    .from(nodes)
    .where(and(eq(nodes.createdBy, uid), ne(nodes.status, "approved")))
    .orderBy(desc(nodes.createdAt));
  const items: SubmissionItem[] = [];
  for (const s of subs) {
    let reason: string | null = null;
    if (s.status === "rejected") {
      const last = await db
        .select({ reason: moderations.reason })
        .from(moderations)
        .where(and(eq(moderations.itemType, "nodes"), eq(moderations.itemId, s.id)))
        .orderBy(desc(moderations.createdAt))
        .limit(1);
      reason = last[0]?.reason ?? null;
    }
    items.push({ ...s, reason });
  }
  return NextResponse.json(items);
}
