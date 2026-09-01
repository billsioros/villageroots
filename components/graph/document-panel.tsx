"use client";

import type { GraphNode, RichTextJSON } from "@/lib/graph/types";
import { TYPE_META, tintHex } from "@/lib/graph/helpers";
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
  const nodeColor = TYPE_META[node.type].color;

  return (
    <div className="flex flex-col">
      <div
        className="shrink-0 border-b shadow-md"
        style={{
          background: `linear-gradient(to bottom right, ${tintHex(nodeColor, 0.78)}, ${tintHex(nodeColor, 0.58)})`,
        }}
      >
        <div className="flex items-center justify-between gap-3 px-6 py-8 pr-12">
          <div className="flex min-w-0 items-center gap-4">
            <span
              className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-xl text-white shadow-sm"
              style={{ backgroundColor: nodeColor }}
            >
              {node.mark}
            </span>
            <h2 className="min-w-0 truncate text-2xl font-semibold tracking-tight">{node.label}</h2>
          </div>
          <span className="shrink-0 rounded-full bg-black/55 px-3 py-1 text-[11px] text-white">
            {TYPE_META[node.type].label}
          </span>
        </div>
      </div>
      <div className="p-6">
        <RichTextEditor initialContent={node.documentContent} onSave={onSave} placeholder="Write the story…" />
      </div>
    </div>
  );
}
