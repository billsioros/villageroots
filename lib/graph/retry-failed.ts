import { eq } from "drizzle-orm";
import { db } from "./db";
import { nodeEmbeddings } from "@/drizzle/schema";
import { ingestEmbedding } from "./ingest";

export async function listFailedNodeIds(): Promise<string[]> {
  const rows = await db
    .select({ nodeId: nodeEmbeddings.nodeId })
    .from(nodeEmbeddings)
    .where(eq(nodeEmbeddings.status, "failed"));
  return rows.map((r) => r.nodeId);
}

export async function runRetry(opts: { fetchImpl?: typeof fetch } = {}): Promise<{
  total: number;
  succeeded: number;
  failed: number;
}> {
  const ids = await listFailedNodeIds();
  let succeeded = 0;
  let failed = 0;
  for (const id of ids) {
    const r = await ingestEmbedding(id, { fetchImpl: opts.fetchImpl }).catch(() => ({ status: "failed" as const }));
    if (r.status === "embedded") succeeded += 1;
    else failed += 1;
  }
  return { total: ids.length, succeeded, failed };
}
