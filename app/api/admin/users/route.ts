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
  const name = hasNames ? (typeof body.name === "string" ? body.name.trim() : "") : "";
  const surname = hasNames ? (typeof body.surname === "string" ? body.surname.trim() : "") : "";
  if (hasNames && (!name || !surname)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  let role: Role | undefined;
  if (body.role !== undefined) {
    if (typeof body.role !== "string" || !isRole(body.role)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    role = body.role;
  }

  let isActive: boolean | undefined;
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    if (!body.isActive && userId === uid) {
      return NextResponse.json({ error: "Cannot deactivate your own account." }, { status: 400 });
    }
    isActive = body.isActive;
  }

  if (!hasNames && role === undefined && isActive === undefined) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  let effectiveRole: Role = "contributor";
  if (role !== undefined) {
    if (userId === uid) {
      return NextResponse.json({ error: "Cannot change your own role." }, { status: 400 });
    }
    effectiveRole = (await getRoleForUser(userId)) ?? "contributor";
    if (effectiveRole === "admin" && role === "contributor" && (await countAdmins()) <= 1) {
      return NextResponse.json({ error: "Cannot demote the last admin." }, { status: 400 });
    }
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server is not configured." }, { status: 500 });
  }

  const email = typeof body.email === "string" ? body.email : "";

  if (hasNames) {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: { name, surname },
    });
    if (error) {
      return NextResponse.json({ error: "Failed to update user." }, { status: 500 });
    }
  }

  if (role !== undefined && effectiveRole !== role) {
    await setRoleForUser(userId, role);
    await logAudit("role_change", "user", email || userId, {
      roleBefore: effectiveRole,
      roleAfter: role,
    });
  }

  if (isActive !== undefined) {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: isActive ? "none" : "876000h",
    });
    if (error) {
      return NextResponse.json({ error: "Failed to update user." }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}