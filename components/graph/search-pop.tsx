"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PopoverShell } from "./popover-shell";
import { useGraphStore } from "@/store/graphStore";

export function SearchPop() {
  const nodes = useGraphStore((s) => s.nodes);
  const selectNode = useGraphStore((s) => s.selectNode);
  const flashNodes = useGraphStore((s) => s.flashNodes);
  const pushToast = useGraphStore((s) => s.pushToast);
  const setSearchOpen = useGraphStore((s) => s.setSearchOpen);
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return nodes
      .filter((n) => n.label.toLowerCase().includes(t) || (n.subtitle ?? "").toLowerCase().includes(t))
      .slice(0, 5);
  }, [q, nodes]);

  const run = (ids: string[]) => {
    if (ids.length === 1) {
      selectNode(ids[0]);
      setSearchOpen(false);
      setQ("");
    } else {
      flashNodes(ids);
      pushToast({ tone: "info", message: `${ids.length} matches flash on the canvas` });
      setQ("");
    }
  };

  return (
    <PopoverShell title="Search" onClose={() => setSearchOpen(false)}>
      <div className="p-3">
        <div className="flex items-center gap-2 rounded-xl border bg-surface-warm px-3 py-2.5">
          <Search size={15} className="text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const ids = results.map((r) => r.id);
                run(ids);
              }
            }}
            placeholder="Search people, places, stories…"
            className="w-full bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="mt-2">
          {q.trim() === "" ? (
            <div className="px-2 py-3 text-center text-[12px] text-muted-foreground">
              Try “mill”, “kalyvia” or “church”
            </div>
          ) : results.length === 0 ? (
            <div className="px-2 py-3 text-center text-[12px] text-muted-foreground">
              No matches — nothing lives here yet
            </div>
          ) : (
            results.map((r) => (
              <button
                key={r.id}
                onClick={() => run([r.id])}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] hover:bg-surface-warm"
              >
                <span
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white"
                  style={{ backgroundColor: r.color }}
                >
                  {r.mark}
                </span>
                <span className="font-medium">{r.label}</span>
                {r.subtitle && <span className="ml-auto text-muted-foreground">{r.subtitle}</span>}
              </button>
            ))
          )}
        </div>
      </div>
    </PopoverShell>
  );
}
