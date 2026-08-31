import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/graph/db";
import { nodes } from "@/drizzle/schema";
import { sessionUid } from "@/lib/graph/session";
import { isAdminUid } from "@/lib/graph/admin";
import type { RichTextJSON } from "@/lib/graph/types";

const MAX_DOC_BYTES = 1_000_000;

function isValidDoc(value: unknown): value is RichTextJSON {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return typeof (value as { type?: unknown }).type === "string";
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const uid = await sessionUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const doc = (body as { document_content?: unknown }).document_content;
  if (!isValidDoc(doc)) {
    return NextResponse.json({ error: "document_content must be an object" }, { status: 400 });
  }
  if (JSON.stringify(doc).length > MAX_DOC_BYTES) {
    return NextResponse.json({ error: "document_content too large" }, { status: 400 });
  }

  const [row] = await db.select().from(nodes).where(eq(nodes.slug, id)).limit(1);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAdmin = await isAdminUid(uid);
  if (!isAdmin && row.createdBy !== uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [updated] = await db
    .update(nodes)
    .set({ documentContent: doc, updatedAt: new Date() })
    .where(eq(nodes.slug, id))
    .returning();

  return NextResponse.json(updated);
}
