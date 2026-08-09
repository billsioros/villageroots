"use client";

import { Minus, Plus } from "lucide-react";
import { useGraphStore } from "@/store/graphStore";

export function StageUi() {
  const zoomPct = useGraphStore((s) => s.zoomPct);
  const zoomIn = useGraphStore((s) => s.zoomIn);
  const zoomOut = useGraphStore((s) => s.zoomOut);

  return (
    <div className="absolute bottom-5 left-5 flex flex-col overflow-hidden rounded-xl border bg-card/90 shadow-elev-raised backdrop-blur">
      <button
        onClick={zoomIn}
        className="grid h-9 w-9 place-items-center hover:bg-surface-warm"
        aria-label="Zoom in"
      >
        <Plus size={15} />
      </button>
      <div className="h-px bg-border" />
      <button
        onClick={zoomOut}
        className="grid h-9 w-9 place-items-center hover:bg-surface-warm"
        aria-label="Zoom out"
      >
        <Minus size={15} />
      </button>
      <div className="h-px bg-border" />
      <div className="flex h-9 w-9 items-center justify-center text-[11px] font-medium text-muted-foreground">
        {zoomPct}%
      </div>
    </div>
  );
}
