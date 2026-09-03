import { NextResponse } from "next/server";
import { sessionUid } from "@/lib/graph/session";
import { isAdminUid } from "@/lib/graph/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRoleForUser } from "@/lib/graph/rbac";

export async function GET() {
  const uid = await sessionUid();
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isAdminUid(uid))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ users: [] });
  }

  const { data: listData, error } = await admin.auth.admin.listUsers();
  if (error) {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }

  const users = await Promise.all(
    listData.users.map(async (u) => ({
      id: u.id,
      email: u.email ?? "",
      full_name: u.user_metadata?.full_name ?? null,
      role: await getRoleForUser(u.id),
      is_active: !u.banned_until,
      last_sign_in_at: u.last_sign_in_at ?? null,
      created_at: u.created_at ?? null,
    })),
  );

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const uid = await sessionUid();
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isAdminUid(uid))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { userId?: unknown; isActive?: unknown };
  try {
    body = (await request.json()) as { userId?: unknown; isActive?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId : "";
  const isActive = typeof body.isActive === "boolean" ? body.isActive : null;
  if (!userId || isActive === null) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server is not configured." }, { status: 500 });
  }

  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: isActive ? "none" : "100y",
  });
  if (error) {
    return NextResponse.json({ error: "Failed to update user." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}