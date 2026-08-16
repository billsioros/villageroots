"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { DocumentPanel } from "./document-panel";
import { RelationsPanel } from "./relations-panel";
import DraftEditor from "./draft-editor";
import { useGraphStore } from "@/store/graphStore";
import { TYPE_META } from "@/lib/graph/helpers";
import { type GraphNode, type DraftNode } from "@/lib/graph/types";

const TABS = [
  { id: "document", label: "Document" },
  { id: "relations", label: "Relations" },
] as const;

export function SidePanel() {
  const [tab, setTab] = useState<"document" | "relations">("document");
  const clearSelection = useGraphStore((s) => s.clearSelection);

  type Selected =
    | { node: GraphNode; isDraft: false }
    | { node: GraphNode; isDraft: true; draft: DraftNode };

  const selectedId = useGraphStore((s) => s.selectedId);
  const existing = useGraphStore((s) => (s.selectedId ? s.nodesMap[s.selectedId] ?? null : null));
  const draft = useGraphStore((s) => (s.selectedId ? s.draftNodes.find((x) => x.id === s.selectedId) ?? null : null));

  const selected = useMemo<Selected | null>(() => {
    if (!selectedId) return null;
    if (existing) return { node: existing, isDraft: false };
    if (!draft) return null;
    return {
      node: {
        ...draft,
        color: TYPE_META[draft.type].color,
        mark: TYPE_META[draft.type].glyph,
        subtitle: draft.subtitle ?? "",
        description: draft.description ?? "",
      },
      isDraft: true,
      draft,
    };
  }, [selectedId, existing, draft]);

  if (!selected) return null;

  return (
    <aside className="absolute right-0 top-0 z-30 flex h-full w-[400px] flex-col border-l bg-card">
      <div className="flex h-12 shrink-0 items-center gap-1 border-b px-3">
        {selected.isDraft ? (
          <span className="truncate text-sm font-semibold">{selected.draft.label}</span>
        ) : (
          TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium ${
                tab === t.id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-surface-warm"
              }`}
            >
              {t.label}
            </button>
          ))
        )}
        <button
          onClick={() => {
            clearSelection();
          }}
          className="ml-auto grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-surface-warm"
          aria-label="Close panel"
        >
          <X size={14} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {selected.isDraft ? (
          <DraftEditor draft={selected.draft} />
        ) : tab === "document" ? (
          <DocumentPanel node={selected.node} />
        ) : (
          <RelationsPanel node={selected.node} />
        )}
      </div>
    </aside>
  );
}
