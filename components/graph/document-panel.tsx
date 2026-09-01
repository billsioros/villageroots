"use client";

import type { GraphNode, RichTextJSON } from "@/lib/graph/types";
import { TYPE_META } from "@/lib/graph/helpers";
import { RichTextEditor } from "./rich-text-editor";
import { saveNodeDocumentContent } from "@/lib/graph/save-node-doc";
import { useGraphStore } from "@/store/graphStore";

export function buildNodeDocSave(
  nodeId: string,
  updateNode: (id: string, patch: { documentContent: RichTextJSON }) => void,
) {
  return async (json: RichTextJSON) => {
    const res = await saveNodeDocumentContent(nodeId, json);
    if (!res.ok) throw new Error(res.error);
    updateNode(nodeId, { documentContent: json });
  };
}

export function DocumentPanel({ node }: { node: GraphNode }) {
  const updateNode = useGraphStore((s) => s.updateNode);
  const onSave = buildNodeDocSave(node.id, updateNode);

  return (
    <div className="flex flex-col">
      <div className="shrink-0 border-b bg-gradient-to-br from-[#f3e9dd] to-[#e3d3bf]">
        <div className="flex items-center justify-between gap-3 p-5">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-lg text-white shadow-sm"
              style={{ backgroundColor: TYPE_META[node.type].color }}
            >
              {node.mark}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-semibold tracking-tight">{node.label}</h2>
              {node.subtitle && <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{node.subtitle}</p>}
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-black/55 px-3 py-1 text-[11px] text-white">
            {TYPE_META[node.type].label}
          </span>
        </div>
      </div>
      <div className="p-5">
        <RichTextEditor initialContent={node.documentContent} onSave={onSave} placeholder="Write the story…" />
      </div>
    </div>
  );
}
