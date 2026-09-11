import { NextResponse } from "next/server";
import { sessionUid } from "@/lib/graph/session";
import { isAdminUid } from "@/lib/graph/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRoleForUser, countAdmins, setRoleForUser, isRole, type Role } from "@/lib/graph/rbac";
import { logAudit } from "@/lib/graph/audit";

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
      name: u.user_metadata?.name ?? null,
      surname: u.user_metadata?.surname ?? null,
      role: (await getRoleForUser(u.id)) ?? "contributor",
      is_active: !u.banned_until,
      last_sign_in_at: u.last_sign_in_at ?? null,
      created_at: u.created_at ?? null,
    })),
  );

  return NextResponse.json({ users });
}

async function applyRoleChange(
  actorUid: string,
  userId: string,
  role: Role,
  email: string,
): Promise<NextResponse> {
  if (userId === actorUid) {
    return NextResponse.json({ error: "Cannot change your own role." }, { status: 400 });
  }

  const effectiveRole = (await getRoleForUser(userId)) ?? "contributor";

  if (effectiveRole === role) {
    return NextResponse.json({ ok: true });
  }

  if (
    effectiveRole === "admin" &&
    role === "contributor" &&
    (await countAdmins()) <= 1
  ) {
    return NextResponse.json({ error: "Cannot demote the last admin." }, { status: 400 });
  }

  await setRoleForUser(userId, role);
  await logAudit("role_change", "user", email || userId, {
    roleBefore: effectiveRole,
    roleAfter: role,
  });

  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const uid = await sessionUid();
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isAdminUid(uid))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: {
    userId?: unknown;
    isActive?: unknown;
    name?: unknown;
    surname?: unknown;
    role?: unknown;
    email?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId : "";
  if (!userId) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const hasNames = body.name !== undefined || body.surname !== undefined;
  const hasToggle = body.isActive !== undefined;
  const hasRole = body.role !== undefined;
  const operations = [hasNames, hasToggle, hasRole].filter(Boolean).length;
  if (operations !== 1) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server is not configured." }, { status: 500 });
  }

  if (hasNames) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const surname = typeof body.surname === "string" ? body.surname.trim() : "";
    if (!name || !surname) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    const { error } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: { name, surname },
    });
    if (error) {
      return NextResponse.json({ error: "Failed to update user." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (hasRole) {
    if (typeof body.role !== "string" || !isRole(body.role)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    const email = typeof body.email === "string" ? body.email : "";
    return applyRoleChange(uid, userId, body.role, email);
  }

  const isActive = typeof body.isActive === "boolean" ? body.isActive : null;
  if (isActive === null) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: isActive ? "none" : "876000h",
  });
  if (error) {
    return NextResponse.json({ error: "Failed to update user." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}