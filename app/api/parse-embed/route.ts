import { NextRequest, NextResponse } from "next/server";
import { parseEmbed } from "@/lib/graph/embed";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }
  const url = (body as { url?: unknown }).url;
  if (typeof url !== "string" || url.trim().length === 0) {
    return NextResponse.json({ ok: false, error: "url is required" }, { status: 400 });
  }
  const result = await parseEmbed(url.trim());
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 422 });
  }
  return NextResponse.json({ ok: true, data: result.data });
}
