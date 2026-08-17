import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/graph/db";
import { nodes } from "@/drizzle/schema";
import { graphPolicy, maskPrivateLiving, shouldMaskLivingOnRead } from "@/lib/graph/policy";
import { sessionUid } from "@/lib/graph/session";
import { isAdminUid } from "@/lib/graph/admin";

const MAX_LIMIT = 500;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 500), 1), MAX_LIMIT);
  const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);
  const uid = await sessionUid();
  const isAdmin = uid ? await isAdminUid(uid) : false;
  const rows = await db
    .select()
    .from(nodes)
    .where(graphPolicy(uid, { status: nodes.status, createdBy: nodes.createdBy }))
    .orderBy(nodes.createdAt)
    .limit(limit)
    .offset(offset);
  const output = rows.map((row) =>
    shouldMaskLivingOnRead(row, { uid, isAdmin }) ? maskPrivateLiving(row) : row,
  );
  return NextResponse.json(output);
}
