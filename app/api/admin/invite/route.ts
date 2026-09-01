import { NextRequest, NextResponse } from "next/server";
import { sessionUid } from "@/lib/graph/session";
import { isAdminUid } from "@/lib/graph/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateEmail } from "@/lib/auth/validation";
import { generateInitialPassword } from "@/lib/auth/password";

export async function POST(request: NextRequest) {
  const uid = await sessionUid();
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isAdminUid(uid))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { email?: unknown };
  try {
    body = (await request.json()) as { email?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (validateEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server is not configured for invites." }, { status: 500 });
  }

  const redirectTo = `${request.nextUrl.origin}/auth/invite`;
  const { error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (error) {
    if (typeof error.status === "number" && error.status >= 400 && error.status < 500) {
      return NextResponse.json(
        { error: "This email can't be invited right now — it may already have an account." },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invite failed. Please try again." }, { status: 500 });
  }

  // Generate an initial password so the admin can share it directly
  const password = generateInitialPassword();

  // Find the newly created user to set the password
  const { data: listData, error: listError } = await admin.auth.admin.listUsers();
  if (listError) {
    return NextResponse.json({ error: "Invite sent but could not set password. Please try again." }, { status: 500 });
  }
  const newUser = listData.users.find((u) => u.email === email);
  if (!newUser) {
    return NextResponse.json({ error: "Invite sent but could not set password. Please try again." }, { status: 500 });
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(newUser.id, {
    password,
    email_confirm: true,
  });
  if (updateError) {
    return NextResponse.json({ error: "Invite sent but could not set password. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, password });
}