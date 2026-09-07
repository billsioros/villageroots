import { createHash } from "node:crypto";
import { richTextToText } from "./rich-text-to-text";
import type { NodeRow } from "@/drizzle/schema";

export const EMBEDDING_MODEL = "nvidia/nemotron-3-embed-1b:free";
const EMBEDDINGS_URL = "https://openrouter.ai/api/v1/embeddings";

export function computeContentHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function buildEmbeddableText(node: NodeRow): string {
  const parts: string[] = [node.label];
  if (node.description) parts.push(node.description);
  const docText = node.documentContent ? richTextToText(node.documentContent) : "";
  if (docText) parts.push(docText);
  return parts.join("\n").trim();
}

export async function embedText(
  text: string,
  opts: { fetchImpl?: typeof fetch } = {},
): Promise<number[]> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");
  const res = await fetchImpl(EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
  });
  if (!res.ok) {
    throw new Error(`OpenRouter embeddings failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
  const payload = (await res.json()) as { data?: { embedding?: number[] }[] };
  const embedding = payload.data?.[0]?.embedding;
  if (!embedding || embedding.length === 0) throw new Error("OpenRouter returned no embedding");
  return embedding;
}
