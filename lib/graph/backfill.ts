import { eq } from "drizzle-orm";
import { db } from "./db";
import { nodes, nodeEmbeddings } from "@/drizzle/schema";
import { ingestEmbedding } from "./ingest";

export async function listNodesPendingEmbedding(): Promise<{ id: string }[]> {
  const approved = await db
    .select({ id: nodes.id })
    .from(nodes)
    .where(eq(nodes.status, "approved"));
  const embeddable = await db
    .select({ nodeId: nodeEmbeddings.nodeId, status: nodeEmbeddings.status })
    .from(nodeEmbeddings);
  const embeddedSet = new Set<string>();
  for (const e of embeddable) {
    if (e.status === "embedded") embeddedSet.add(e.nodeId);
  }
  return approved.filter((n) => !embeddedSet.has(n.id));
}

export async function runBackfill(opts: {
  batchSize?: number;
  delayMs?: number;
  fetchImpl?: typeof fetch;
} = {}): Promise<{ total: number; processed: number; failed: number }> {
  const batchSize = Math.max(1, opts.batchSize ?? 10);
  const delayMs = Math.max(0, opts.delayMs ?? 1000);
  const pending = await listNodesPendingEmbedding();
  let processed = 0;
  let failed = 0;

  for (let i = 0; i < pending.length; i += batchSize) {
    const batch = pending.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map((n) => ingestEmbedding(n.id, { fetchImpl: opts.fetchImpl }).catch(() => ({ status: "failed" as const }))),
    );
    for (const r of results) {
      if (r.status === "failed") failed += 1;
    }
    processed += batch.length;
    if (i + batch.length < pending.length && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return { total: pending.length, processed, failed };
}
