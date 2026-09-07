interface RichTextLeaf {
  text?: unknown;
  content?: unknown;
}

export function richTextToText(doc: unknown): string {
  if (!doc || typeof doc !== "object") return "";
  const root = doc as RichTextLeaf;
  const parts: string[] = [];
  collectText(root, parts);
  return parts
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .join("\n");
}

function collectText(node: RichTextLeaf, out: string[]): void {
  if (typeof node.text === "string") {
    out.push(node.text);
    return;
  }
  const children = node.content;
  if (!Array.isArray(children)) return;
  for (const child of children) {
    collectText(child as RichTextLeaf, out);
  }
}
