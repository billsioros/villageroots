import { NextResponse } from "next/server";
import { sessionUid } from "@/lib/graph/session";
import { buildOcrMessages, parseOcrResponse, toDrafts } from "@/lib/ocr/extract";
import { OCR_EXTRACTION_JSON_SCHEMA } from "@/lib/ocr/schema";
import { deleteScanObject, downloadScanObject } from "@/lib/ocr/storage";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openrouter/free";
const REQUEST_TIMEOUT_MS = 60_000;

const PATH_PATTERN = /^[^/]+\/[\w.-]+\.(jpg|jpeg|png|webp)$/i;
const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function POST(request: Request) {
  const userId = await sessionUid();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to import documents" }, { status: 401 });
  }

  let path: string;
  try {
    const body = (await request.json()) as { path?: unknown };
    if (typeof body.path !== "string" || body.path.length === 0) throw new Error("bad body");
    path = body.path;
  } catch {
    return NextResponse.json({ error: "Scan not found — please re-upload" }, { status: 400 });
  }
  if (!path.startsWith(`${userId}/`) || !PATH_PATTERN.test(path)) {
    return NextResponse.json({ error: "Scan not found — please re-upload" }, { status: 400 });
  }

  try {
    const { data, error } = await downloadScanObject(path);
    if (error || !data) {
      return NextResponse.json({ error: "Scan not found — please re-upload" }, { status: 404 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OCR is not configured yet" }, { status: 503 });
    }

    const bytes = Buffer.from(await data.arrayBuffer());
    const extension = path.split(".").pop()?.toLowerCase() ?? "jpg";
    const mimeType = MIME_BY_EXTENSION[extension] ?? "image/jpeg";
    const dataUri = `data:${mimeType};base64,${bytes.toString("base64")}`;

    const completion = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
        messages: buildOcrMessages(dataUri),
        response_format: { type: "json_schema", json_schema: OCR_EXTRACTION_JSON_SCHEMA },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!completion.ok) {
      console.error("OpenRouter request failed", completion.status);
      return NextResponse.json({ error: "Extraction failed — try again" }, { status: 502 });
    }

    const payload = (await completion.json()) as {
      choices?: { message?: { content?: unknown } }[];
    };
    const extraction = parseOcrResponse(payload.choices?.[0]?.message?.content);
    if (!extraction) {
      console.error("OpenRouter returned unparseable content");
      return NextResponse.json({ error: "Extraction failed — try again" }, { status: 502 });
    }

    return NextResponse.json(toDrafts(extraction));
  } catch (cause) {
    console.error("OCR extraction threw", cause);
    return NextResponse.json({ error: "Extraction failed — try again" }, { status: 502 });
  } finally {
    // Cleanup contract: the scan never outlives this request, success or failure.
    try {
      const { error: deleteError } = await deleteScanObject(path);
      if (deleteError) console.error("Failed to delete scan", path, deleteError);
    } catch (deleteCause) {
      console.error("Scan cleanup threw", path, deleteCause);
    }
  }
}
