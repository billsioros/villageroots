import { eq } from "drizzle-orm";
import { db } from "./db";
import { nodes, nodeEmbeddings } from "@/drizzle/schema";
import {
  EMBEDDING_MODEL,
  buildEmbeddableText,
  computeContentHash,
  embedText,
} from "./embeddings";

export type IngestResult =
  | { status: "embedded" }
  | { status: "skipped" }
  | { status: "failed"; error?: string };

export async function ingestEmbedding(
  nodeId: string,
  opts: { fetchImpl?: typeof fetch } = {},
): Promise<IngestResult> {
  const row = await db
    .select({
      id: nodes.id,
      label: nodes.label,
      description: nodes.description,
      documentContent: nodes.documentContent,
      type: nodes.type,
    })
    .from(nodes)
    .where(eq(nodes.id, nodeId))
    .limit(1);
  if (row.length === 0) return { status: "skipped" };

  const node = row[0];
  const text = buildEmbeddableText(node as Parameters<typeof buildEmbeddableText>[0]);
  if (!text) return { status: "skipped" };
  const contentHash = computeContentHash(text);

  const existing = await db
    .select({ status: nodeEmbeddings.status, contentHash: nodeEmbeddings.contentHash })
    .from(nodeEmbeddings)
    .where(eq(nodeEmbeddings.nodeId, nodeId))
    .limit(1);
  if (existing.length > 0 && existing[0].status === "embedded" && existing[0].contentHash === contentHash) {
    return { status: "skipped" };
  }

  try {
    const embedding = await embedText(text, opts);
    await db.insert(nodeEmbeddings)
      .values({
        nodeId,
        contentHash,
        model: EMBEDDING_MODEL,
        embedding: embedding as unknown as never,
        dimensions: 2048,
        nodeType: node.type,
        label: node.label,
        status: "embedded",
      })
      .onConflictDoUpdate({
        target: nodeEmbeddings.nodeId,
        set: {
          contentHash,
          model: EMBEDDING_MODEL,
          embedding: embedding as unknown as never,
          dimensions: 2048,
          nodeType: node.type,
          label: node.label,
          status: "embedded",
          error: null,
          updatedAt: new Date(),
        },
      });
    return { status: "embedded" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    try {
      await db.insert(nodeEmbeddings)
        .values({
          nodeId,
          contentHash,
          model: EMBEDDING_MODEL,
          embedding: Array(2048).fill(0) as unknown as never,
          dimensions: 2048,
          nodeType: node.type,
          label: node.label,
          status: "failed",
          error: message,
        })
        .onConflictDoUpdate({
          target: nodeEmbeddings.nodeId,
          set: {
            status: "failed",
            error: message,
            updatedAt: new Date(),
          },
        });
    } catch {
      // best effort
    }
    return { status: "failed", error: message };
  }
}
