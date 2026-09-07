import { NextRequest, NextResponse } from "next/server";
import { sessionUid } from "@/lib/graph/session";
import { isAdminUid } from "@/lib/graph/admin";
import { runBackfill } from "@/lib/graph/backfill";

export async function POST(request: NextRequest) {
  const uid = await sessionUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdminUid(uid))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const batchSize = Number(request.nextUrl.searchParams.get("batchSize") ?? 10);
  const delayMs = Number(request.nextUrl.searchParams.get("delayMs") ?? 1000);

  const result = await runBackfill({
    batchSize: Number.isFinite(batchSize) ? batchSize : 10,
    delayMs: Number.isFinite(delayMs) ? delayMs : 1000,
  });
  return NextResponse.json(result);
}
