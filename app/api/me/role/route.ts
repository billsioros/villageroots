import { NextResponse } from "next/server";
import { sessionUid } from "@/lib/graph/session";
import { getRoleForUser } from "@/lib/graph/rbac";

export async function GET() {
  const uid = await sessionUid();
  if (!uid) return NextResponse.json({ role: null });
  const role = await getRoleForUser(uid);
  return NextResponse.json({ role });
}
