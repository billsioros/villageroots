import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  let body: { name?: unknown; surname?: unknown };
  try {
    body = (await request.json()) as { name?: unknown; surname?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const surname = typeof body.surname === "string" ? body.surname.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (!surname) {
    return NextResponse.json({ error: "Surname is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ data: { name, surname } });
  if (error) {
    return NextResponse.json({ error: "We couldn't update your profile — please try again." }, { status: 500 });
  }

  return NextResponse.json({ name, surname });
}