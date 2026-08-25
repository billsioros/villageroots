"use client";

import { MapPin } from "lucide-react";
import { useGraphStore } from "@/store/graphStore";

export function EmptyState() {
  const setNewNodeOpen = useGraphStore((s) => s.setNewNodeOpen);
  const setOcrOpen = useGraphStore((s) => s.setOcrOpen);

  return (
    <div className="absolute left-1/2 top-1/2 w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card/95 p-6 shadow-elev-raised backdrop-blur">
      <div className="flex justify-center">
        <MapPin className="h-12 w-12 text-muted-foreground/50" />
      </div>
      <h2 className="mt-3 text-center text-lg font-semibold tracking-tight">
        Your village map is empty
      </h2>
      <p className="mt-1.5 text-center text-[13px] leading-relaxed text-muted-foreground">
        Add people, places, and events to start building your village knowledge
        graph.
      </p>
      <button
        onClick={() => setNewNodeOpen(true)}
        className="mt-4 w-full rounded-full bg-foreground py-2.5 text-[13px] font-medium text-background hover:opacity-90"
      >
        Add your first node
      </button>
      <button
        onClick={() => setOcrOpen(true)}
        className="mt-2 w-full rounded-full border py-2.5 text-[13px] font-medium text-muted-foreground hover:bg-surface-warm"
      >
        Import a document
      </button>
    </div>
  );
}
