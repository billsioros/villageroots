import type { RichTextJSON } from "@/lib/graph/types";

export async function saveNodeDocumentContent(
  nodeId: string,
  documentContent: RichTextJSON,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const res = await fetch(`/api/graph/nodes/${encodeURIComponent(nodeId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document_content: documentContent }),
  });
  if (res.ok) return { ok: true };
  let error = "Save failed";
  try {
    const body = (await res.json()) as { error?: string };
    error = body.error ?? error;
  } catch {
    /* ignore parse errors */
  }
  return { ok: false, status: res.status, error };
}
