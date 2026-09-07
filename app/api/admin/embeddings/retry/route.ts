import { NextRequest, NextResponse } from "next/server";
import { sessionUid } from "@/lib/graph/session";
import { isAdminUid } from "@/lib/graph/admin";
import { runRetry } from "@/lib/graph/retry-failed";

export async function POST(request: NextRequest) {
  const uid = await sessionUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdminUid(uid))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const result = await runRetry();
  return NextResponse.json(result);
}
