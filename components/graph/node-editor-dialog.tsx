"use client";

import { useState } from "react";
import { DocumentPanel } from "./document-panel";
import { RelationsPanel } from "./relations-panel";
import DraftEditor from "./draft-editor";
import { useGraphStore } from "@/store/graphStore";
import { resolveSelection } from "@/lib/graph/resolve-selection";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TABS = [
  { id: "document", label: "Document" },
  { id: "relations", label: "Relations" },
] as const;

export function NodeEditorDialog() {
  const [tab, setTab] = useState<"document" | "relations">("document");
  const sidepanelOpen = useGraphStore((s) => s.sidepanelOpen);
  const clearSelection = useGraphStore((s) => s.clearSelection);
  const selectedId = useGraphStore((s) => s.selectedId);
  const nodesMap = useGraphStore((s) => s.nodesMap);
  const draftNodes = useGraphStore((s) => s.draftNodes);

  const selected = resolveSelection(selectedId, nodesMap, draftNodes);

  return (
    <Dialog open={sidepanelOpen} onOpenChange={clearSelection}>
      <DialogContent className="max-w-3xl overflow-hidden p-0">
        <DialogHeader>
          <DialogTitle className="sr-only">
            {selected?.node.label ?? "Node"}
          </DialogTitle>
        </DialogHeader>

        {selected && !selected.isDraft && (
          <div className="flex gap-1 px-6 pt-5 pb-3">
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
          </div>
        )}

        <div className="h-[64vh] overflow-y-auto">
          {selected?.isDraft ? (
            <DraftEditor draft={selected.draft} />
          ) : !selected ? null : tab === "document" ? (
            <DocumentPanel node={selected.node} />
          ) : (
            <div className="p-6">
              <RelationsPanel node={selected.node} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
