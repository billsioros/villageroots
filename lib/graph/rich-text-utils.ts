import type { RichTextJSON } from "@/lib/graph/types";

export function emptyDoc(): RichTextJSON {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

export function isEmptyDoc(doc: RichTextJSON | null | undefined): boolean {
  if (!doc || typeof doc !== "object") return true;
  const content = (doc as { content?: unknown }).content;
  if (content === undefined) return true;
  if (Array.isArray(content)) {
    return content.length === 0 || content.every((n) => typeof n === "object" && n !== null && !hasMeaningfulContent(n));
  }
  return true;
}

function hasMeaningfulContent(node: unknown): boolean {
  if (typeof node !== "object" || node === null) return false;
  const n = node as { content?: unknown };
  if (Array.isArray(n.content) && n.content.length > 0) {
    return n.content.some((c) => {
      const cobj = c as { text?: unknown; type?: string };
      if (typeof cobj?.text === "string" && cobj.text.trim().length > 0) return true;
      return hasMeaningfulContent(c);
    });
  }
  return false;
}

export function withText(text: string): RichTextJSON {
  if (!text.trim()) return emptyDoc();
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}
