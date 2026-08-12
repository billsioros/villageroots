import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/graph/db";
import { nodes } from "@/drizzle/schema";
import { sessionUid } from "@/lib/graph/session";
import { derivePrivacy } from "@/lib/graph/policy";

function slugify(s: string): string {
  return (s || "node")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(request: NextRequest) {
  const uid = await sessionUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    label?: string;
    subtitle?: string;
    description?: string;
    deceased?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad body" }, { status: 400 });
  }
  const label = (body.label ?? "").trim();
  if (!label) return NextResponse.json({ error: "label required" }, { status: 400 });

  const deceased = body.deceased === true;
  const propertyValue = deceased;
  const row = await db
    .insert(nodes)
    .values({
      slug: `${slugify(label)}-${Date.now().toString(36)}`,
      type: "person",
      label,
      subtitle: body.subtitle ?? null,
      description: body.description ?? null,
      properties: { deceased: propertyValue },
      status: "pending",
      privacy: derivePrivacy(deceased),
      createdBy: uid,
    })
    .returning();

  return NextResponse.json(row[0], { status: 201 });
}
