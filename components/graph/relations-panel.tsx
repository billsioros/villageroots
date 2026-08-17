"use client";

import { useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useShallow } from "zustand/react/shallow";
import { useGraphStore, selectAllNodes } from "@/store/graphStore";
import { TYPE_META } from "@/lib/graph/helpers";
import type { GraphNode, Verb } from "@/lib/graph/types";

export function RelationsPanel({ node }: { node: GraphNode }) {
  const edges = useGraphStore((s) => s.edges);
  const nodes = useGraphStore(useShallow(selectAllNodes));
  const suggestedEdges = useGraphStore((s) => s.suggestedEdges);
  const selectNode = useGraphStore((s) => s.selectNode);
  const pushToast = useGraphStore((s) => s.pushToast);

  const related = edges.filter((e) => e.source === node.id || e.target === node.id);
  const suggestions = suggestedEdges.filter((e) => e.source === node.id || e.target === node.id);

  const [verb, setVerb] = useState<Verb>("related_to");
  const [target, setTarget] = useState("");
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);

  const other = (e: { source: string; target: string }) =>
    e.source === node.id ? e.target : e.source;

  const submit = () => {
    if (!verb) {
      pushToast({ tone: "error", message: "Pick a verb" });
      return;
    }
    if (!target) {
      pushToast({ tone: "error", message: "Pick a node" });
      return;
    }
    pushToast({ tone: "success", message: "Proposal submitted for moderation" });
    setOpen(false);
    setNote("");
    setTarget("");
  };

  return (
    <div className="p-5">
      <h3 className="text-sm font-semibold">Connected to {node.label}</h3>
      <div className="mt-3 flex flex-col">
        {related.length === 0 && (
          <p className="py-4 text-center text-[13px] text-muted-foreground">No relations yet.</p>
        )}
        {related.map((e) => {
          const n = nodes.find((n) => n.id === other(e));
          if (!n) return null;
          return (
            <button
              key={e.id}
              onClick={() => selectNode(n.id)}
              className="flex items-center gap-2.5 border-b py-3 text-left last:border-0 hover:bg-surface-warm"
            >
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white"
                style={{ backgroundColor: TYPE_META[n.type].color }}
              >
                {n.mark}
              </span>
              <span className="text-[13px] font-medium">{n.label}</span>
              <span className="ml-auto rounded-full bg-surface-warm px-2 py-0.5 text-[11px] text-muted-foreground">
                {e.verb.replaceAll("_", " ")}
              </span>
            </button>
          );
        })}
      </div>

      {suggestions.length > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            AI suggestions
          </div>
          {suggestions.map((e) => (
            <div key={e.id} className="mb-2 flex items-center gap-2.5 rounded-xl border bg-surface-warm px-3 py-2.5">
              <span className="text-[12px] text-muted-foreground">{e.confidence}%</span>
              <span className="text-[13px]">{e.verb.replaceAll("_", " ")}</span>
              <button
                onClick={() =>
                  pushToast({ tone: "info", message: "AI suggestion submitted for moderation" })
                }
                className="ml-auto rounded-full bg-foreground px-3 py-1 text-[11px] font-medium text-background"
              >
                Add
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 text-[13px] font-medium hover:text-primary"
        >
          <Plus size={14} /> Add relation
          <ChevronRight size={13} className={`transition-transform ${open ? "rotate-90" : ""}`} />
        </button>
        {open && (
          <div className="mt-3 flex flex-col gap-2 rounded-xl border p-3">
            <div className="flex gap-2">
              <select
                value={verb}
                onChange={(e) => setVerb(e.target.value as Verb)}
                className="flex-1 rounded-lg border bg-white px-2 py-2 text-[13px] outline-none focus:border-primary"
              >
                <option value="related_to">related to</option>
                <option value="born_in">born in</option>
                <option value="married_to">married to</option>
                <option value="child_of">child of</option>
                <option value="lived_at">lived at</option>
                <option value="built_by">built by</option>
                <option value="owns_land_at">owns land at</option>
                <option value="attended">attended</option>
                <option value="fought_in">fought in</option>
                <option value="migrated_from">migrated from</option>
                <option value="sibling_of">sibling of</option>
              </select>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="flex-1 rounded-lg border bg-white px-2 py-2 text-[13px] outline-none focus:border-primary"
              >
                <option value="">Choose node…</option>
                {nodes
                  .filter((n) => n.id !== node.id)
                  .map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label}
                    </option>
                  ))}
              </select>
            </div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note (optional)…"
              className="rounded-lg border bg-white px-2 py-2 text-[13px] outline-none focus:border-primary"
            />
            <Button size="sm" className="rounded-full self-end" onClick={submit}>
              Queue for review
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
