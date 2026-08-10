"use client";

import { ChevronRight } from "lucide-react";
import { PopoverShell } from "./popover-shell";
import { useGraphStore } from "@/store/graphStore";

export function LayersPop() {
  const hiddenTypes = useGraphStore((s) => s.hiddenTypes);
  const toggleType = useGraphStore((s) => s.toggleType);
  const setLayersOpen = useGraphStore((s) => s.setLayersOpen);
  const setAboutOpen = useGraphStore((s) => s.setAboutOpen);

  const groups = [
    { label: "Social", types: ["person", "family"] as const },
    { label: "Geography", types: ["landmark", "toponym"] as const },
    { label: "History", types: ["event", "path"] as const },
  ];

  return (
    <PopoverShell title="Layers" onClose={() => setLayersOpen(false)}>
      <div className="p-3">
        {groups.map((g) => (
          <div key={g.label} className="mb-3 last:mb-0">
            <div className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {g.label}
            </div>
            <div className="flex gap-2 px-2">
              {g.types.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                    hiddenTypes[t] ? "bg-surface-warm text-muted-foreground" : "bg-foreground text-background"
                  }`}
                >
                  {t === "person" ? "People" : t === "family" ? "Families" : t === "landmark" ? "Landmarks" : t === "toponym" ? "Toponyms" : t === "event" ? "Events" : "Paths"}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="mt-3 flex items-center justify-between border-t px-2 pt-3 text-[13px]">
          <span className="font-medium">AI suggestions</span>
          <button
            onClick={() => setAboutOpen(true)}
            className="flex items-center gap-0.5 text-muted-foreground hover:text-foreground"
          >
            How this maps to the roadmap
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </PopoverShell>
  );
}
