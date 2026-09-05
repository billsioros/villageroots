import { createClient } from "npm:@supabase/supabase-js@2";
import { chunk, filterExpired } from "./cleanup.ts";

const BUCKET = "archive-scans";
const TTL_MS = 24 * 60 * 60 * 1000;
const PAGE_LIMIT = 100;
const BATCH_SIZE = 1000;

interface ListResult {
  name: string;
  id: string | null;
  metadata: { lastModified?: string } | null;
}

interface Lister {
  list(
    path: string,
    options: { limit: number; offset: number },
  ): Promise<{
    data: ListResult[] | null;
    error: { message: string } | null;
  }>;
}

async function collectFiles(lister: Lister, prefix: string, out: ListResult[]): Promise<void> {
  for (let offset = 0; ; offset += PAGE_LIMIT) {
    const { data, error } = await lister.list(prefix, { limit: PAGE_LIMIT, offset });
    if (error) throw new Error(`list failed: ${error.message}`);
    if (!data || data.length === 0) return;
    for (const item of data) {
      if (item.id === null) {
        const sub = prefix === "" ? item.name : `${prefix}/${item.name}`;
        await collectFiles(lister, sub, out);
      } else {
        out.push(item);
      }
    }
    if (data.length < PAGE_LIMIT) return;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("x-cleanup-secret") !== secret) {
    return new Response("unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const files: ListResult[] = [];
  await collectFiles(supabase.storage.from(BUCKET), "", files);

  const expired = filterExpired(
    files.map((file) => ({ name: file.name, createdAt: file.metadata?.lastModified ?? null })),
    TTL_MS,
    Date.now(),
  );

  let removed = 0;
  for (const batch of chunk(expired, BATCH_SIZE)) {
    const { error } = await supabase.storage.from(BUCKET).remove(batch);
    if (error) {
      return new Response(`remove failed: ${error.message}`, { status: 500 });
    }
    removed += batch.length;
  }

  return new Response(JSON.stringify({ scanned: files.length, removed }), {
    headers: { "content-type": "application/json" },
  });
});
