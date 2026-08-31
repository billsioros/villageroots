"use client";

import { Badge } from "@/components/ui/badge";
import type { GraphNode } from "@/lib/graph/types";
import { TYPE_META } from "@/lib/graph/helpers";
import { RichTextEditor } from "./rich-text-editor";
import { saveNodeDocumentContent } from "@/lib/graph/save-node-doc";

export function DocumentPanel({ node }: { node: GraphNode }) {
  const onSave = async (json: Parameters<typeof saveNodeDocumentContent>[1]) => {
    const res = await saveNodeDocumentContent(node.id, json);
    if (!res.ok) throw new Error(res.error);
  };

  return (
    <div className="flex flex-col">
      <div className="h-44 shrink-0 border-b bg-gradient-to-br from-[#f3e9dd] to-[#e3d3bf] relative">
        <div className="absolute left-4 top-4 flex gap-1.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-[15px] shadow-sm">
            {node.mark}
          </span>
        </div>
        <span className="absolute bottom-4 right-4 rounded-full bg-black/55 px-3 py-1 text-[11px] text-white">
          {TYPE_META[node.type].label}
        </span>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{node.label}</h2>
            {node.subtitle && <p className="mt-0.5 text-[13px] text-muted-foreground">{node.subtitle}</p>}
          </div>
          <Badge variant="secondary" className="rounded-full text-[11px] font-medium">
            {TYPE_META[node.type].label}
          </Badge>
        </div>

        <div className="mt-4">
          <RichTextEditor initialContent={node.documentContent} onSave={onSave} placeholder="Write the story…" />
        </div>
      </div>
    </div>
  );
}
