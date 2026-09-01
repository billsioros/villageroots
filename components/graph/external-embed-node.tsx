"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Trash2, GripVertical } from "lucide-react";
import type { ExternalEmbedAttributes } from "./external-embed-extension";

export function ExternalEmbedNode(props: NodeViewProps) {
  const attrs = props.node.attrs as ExternalEmbedAttributes;
  const deleteNode = () => props.deleteNode();
  const selectNode = () => {
    const pos = props.getPos();
    if (typeof pos === "number") props.editor.commands.setNodeSelection(pos);
  };

  return (
    <NodeViewWrapper
      className="my-2"
      contentEditable={false}
      data-drag-handle
      onMouseDown={selectNode}
    >
      <div
        className={`relative w-full overflow-hidden rounded-xl border bg-white shadow-sm transition ${
          props.selected ? "ring-2 ring-muted-foreground/60" : "border-border"
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b px-2.5 py-1.5">
          <span className="flex items-center text-muted-foreground">
            <GripVertical className="h-4 w-4" />
          </span>
          <button
            type="button"
            onClick={deleteNode}
            aria-label="Remove embed"
            className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {attrs.kind === "map" && attrs.embedHtml ? (
          <div style={{ height: attrs.height ?? 320 }} dangerouslySetInnerHTML={{ __html: attrs.embedHtml }} />
        ) : (
          <div className="flex gap-3 p-4">
            {attrs.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={attrs.thumbnail} alt="" className="h-20 w-28 shrink-0 rounded-lg object-cover" />
            ) : null}
            <div className="min-w-0">
              {attrs.title ? <div className="truncate text-[13px] font-medium leading-snug">{attrs.title}</div> : null}
              {attrs.description ? (
                <div className="mt-1 line-clamp-2 text-[12px] leading-snug text-muted-foreground">
                  {attrs.description}
                </div>
              ) : null}
              <a
                href={attrs.url}
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 block truncate text-[11px] text-primary"
              >
                {attrs.url}
              </a>
            </div>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}