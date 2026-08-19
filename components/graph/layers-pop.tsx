"use client";

import { useMemo } from "react";
import { TYPE_META, countByType } from "@/lib/graph/helpers";
import { useShallow } from "zustand/react/shallow";
import { useGraphStore, selectAllNodes } from "@/store/graphStore";
import { PopoverShell } from "./popover-shell";

const GROUPS = [
  { label: "Social", types: ["person", "family"] as const },
  { label: "Geography", types: ["landmark", "toponym"] as const },
  { label: "History", types: ["event", "path"] as const },
];

const TYPE_LABELS: Record<string, string> = {
  person: "People",
  family: "Families",
  landmark: "Landmarks",
  toponym: "Toponyms",
  event: "Events",
  path: "Paths",
};

export function LayersPop() {
  const nodes = useGraphStore(useShallow(selectAllNodes));
  const counts = useMemo(() => countByType(nodes), [nodes]);
  const hiddenTypes = useGraphStore((s) => s.hiddenTypes);
  const toggleType = useGraphStore((s) => s.toggleType);
  const setLayersOpen = useGraphStore((s) => s.setLayersOpen);

  return (
    <PopoverShell title="Layers" onClose={() => setLayersOpen(false)}>
      <div className="p-3">
        {GROUPS.map((g) => (
          <div key={g.label} className="mb-3 last:mb-0">
            <div className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {g.label}
            </div>
            <div className="flex gap-2 px-2">
              {g.types.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                    hiddenTypes[t] ? "bg-surface-warm text-muted-foreground" : "bg-foreground text-background"
                  }`}
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: TYPE_META[t].color }}
                  />
                  {TYPE_LABELS[t]}
                  <span className="ml-0.5 opacity-60">{counts[t] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PopoverShell>
  );
}
