"use client";

import { useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Trash2, GripVertical } from "lucide-react";
import type { ExternalEmbedAttributes } from "./external-embed-extension";

function resizeInput(
  label: string,
  value: number | undefined,
  onChange: (v: number) => void,
  inputRef: (el: HTMLInputElement | null) => void,
) {
  return (
    <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
      {label}
      <input
        ref={inputRef}
        type="number"
        defaultValue={value ?? 480}
        min={120}
        max={1200}
        onBlur={(e) => onChange(Number(e.target.value))}
        className="w-16 rounded border bg-white px-1 py-0.5 text-right text-[11px]"
      />
    </label>
  );
}

export function ExternalEmbedNode(props: NodeViewProps) {
  const attrs = props.node.attrs as ExternalEmbedAttributes;
  const update = props.updateAttributes;
  const deleteNode = () => props.deleteNode();
  const [selected, setSelected] = useState(false);

  const widthSetter = () => undefined;
  const heightSetter = () => undefined;

  return (
    <NodeViewWrapper
      className="my-2"
      contentEditable={false}
      data-drag-handle
      onMouseDown={() => setSelected(true)}
      onBlur={() => setSelected(false)}
    >
      <div
        className={`relative overflow-hidden rounded-xl border bg-white shadow-sm transition ${
          selected ? "ring-2 ring-primary" : "border-border"
        }`}
        style={{ width: attrs.width ?? 480 }}
      >
        <div className="flex items-center justify-between gap-2 border-b px-2 py-1">
          <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <GripVertical className="h-3 w-3" /> {attrs.kind} embed
          </span>
          <span className="flex items-center gap-2">
            {resizeInput("W", attrs.width, (w) => update({ width: w }), widthSetter)}
            {attrs.kind === "map" && resizeInput("H", attrs.height, (h) => update({ height: h }), heightSetter)}
            <button
              type="button"
              onClick={deleteNode}
              aria-label="Remove embed"
              className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </span>
        </div>

        {attrs.kind === "map" && attrs.embedHtml ? (
          <div style={{ height: attrs.height ?? 320 }} dangerouslySetInnerHTML={{ __html: attrs.embedHtml }} />
        ) : (
          <div className="flex gap-3 p-3">
            {attrs.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={attrs.thumbnail} alt="" className="h-16 w-24 shrink-0 rounded object-cover" />
            ) : null}
            <div className="min-w-0">
              {attrs.title ? <div className="truncate text-[13px] font-medium leading-snug">{attrs.title}</div> : null}
              {attrs.description ? (
                <div className="mt-1 line-clamp-2 text-[12px] leading-snug text-muted-foreground">
                  {attrs.description}
                </div>
              ) : null}
              <a href={attrs.url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-[11px] text-primary">
                {attrs.url}
              </a>
            </div>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
