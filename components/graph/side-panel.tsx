"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { DocumentPanel } from "./document-panel";
import { RelationsPanel } from "./relations-panel";
import { useGraphStore } from "@/store/graphStore";

const TABS = [
  { id: "document", label: "Document" },
  { id: "relations", label: "Relations" },
] as const;

export function SidePanel() {
  const [tab, setTab] = useState<"document" | "relations">("document");
  const node = useGraphStore((s) => (s.selectedId ? s.nodes.find((n) => n.id === s.selectedId) : null));
  const clearSelection = useGraphStore((s) => s.clearSelection);

  if (!node) return null;

  return (
    <aside className="absolute right-0 top-0 z-30 flex h-full w-[400px] flex-col border-l bg-card">
      <div className="flex h-12 shrink-0 items-center gap-1 border-b px-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium ${
              tab === t.id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-surface-warm"
            }`}
          >
            {t.label}
          </button>
        ))}
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
        {tab === "document" ? <DocumentPanel node={node} /> : <RelationsPanel node={node} />}
      </div>
    </aside>
  );
}
