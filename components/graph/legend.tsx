"use client";

import { useMemo } from "react";
import { TYPE_META, countByType } from "@/lib/graph/helpers";
import { useGraphStore } from "@/store/graphStore";

const ORDER = ["person", "family", "landmark", "toponym", "event", "path"] as const;

export function Legend() {
  const nodes = useGraphStore((s) => s.nodes);
  const counts = useMemo(() => countByType(nodes), [nodes]);

  return (
    <div className="absolute left-5 top-5 w-[212px] rounded-2xl border bg-card/90 p-3.5 shadow-elev-raised backdrop-blur">
      <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Legend
      </div>
      <div className="flex flex-col gap-1.5">
        {ORDER.map((t) => (
          <div key={t} className="flex items-center gap-2 text-[13px]">
            <span
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white"
              style={{ backgroundColor: TYPE_META[t].color }}
            >
              {TYPE_META[t].glyph}
            </span>
            <span className="text-foreground">{TYPE_META[t].label}</span>
            <span className="ml-auto text-muted-foreground">{counts[t] ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
