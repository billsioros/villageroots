"use client";

import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import type { GraphNode } from "@/lib/graph/types";
import { TYPE_META } from "@/lib/graph/helpers";

export function DocumentPanel({ node }: { node: GraphNode }) {
  const editRef = useRef<HTMLDivElement>(null);

  const applyMd = (cmd: string) => {
    document.execCommand(cmd, false);
    editRef.current?.focus();
  };

  const facts =
    node.type === "person"
      ? [
          ["Born", "1924"],
          ["Baptized", "Agios Ioannis, Potidaneia"],
          ["Occupation", "Weaver"],
        ]
      : node.type === "family"
      ? [
          ["Root", "Nikolas Katsaris"],
          ["Home", "Kalyvia, Potidaneia"],
        ]
      : node.type === "event"
      ? [
          ["Year", "1944"],
          ["Where", "Village square"],
        ]
      : node.type === "path"
      ? [
          ["From", "Kalyvia"],
          ["To", "Lakka"],
        ]
      : [["Type", "Landmark / Toponym"]];

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

        <dl className="mt-4 divide-y rounded-xl border">
          {facts.map(([k, v]) => (
            <div key={k} className="flex justify-between px-3.5 py-2.5 text-[13px]">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 flex items-center gap-1 rounded-full border bg-surface-warm px-2 py-1">
          <button onClick={() => applyMd("bold")} className="grid h-7 w-8 place-items-center rounded-full text-[13px] font-bold hover:bg-white" title="Bold">
            B
          </button>
          <button onClick={() => applyMd("italic")} className="grid h-7 w-8 place-items-center rounded-full text-[13px] italic hover:bg-white" title="Italic">
            I
          </button>
          <button onClick={() => applyMd("insertUnorderedList")} className="grid h-7 w-8 place-items-center rounded-full text-[13px] hover:bg-white" title="List">
            •≡
          </button>
          <button onClick={() => applyMd("createLink")} className="grid h-7 w-8 place-items-center rounded-full text-[13px] hover:bg-white" title="Link">
            🔗
          </button>
          <span className="ml-auto text-[11px] text-muted-foreground">Markdown</span>
        </div>
        <div
          ref={editRef}
          contentEditable
          suppressContentEditableWarning
          className="mt-2 min-h-[90px] rounded-xl border bg-white p-3 text-[13px] leading-relaxed outline-none focus:border-primary"
        >
          {node.description}
        </div>
      </div>
    </div>
  );
}
