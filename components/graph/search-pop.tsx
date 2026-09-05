"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { ModalShell } from "./modals";
import { useGraphStore } from "@/store/graphStore";
import { useSearchNodes } from "@/lib/graph/queries";
import { TYPE_META } from "@/lib/graph/helpers";

export function SearchPop() {
  const selectNode = useGraphStore((s) => s.selectNode);
  const flashNodes = useGraphStore((s) => s.flashNodes);
  const setPanIntent = useGraphStore((s) => s.setPanIntent);
  const pushToast = useGraphStore((s) => s.pushToast);
  const setSearchOpen = useGraphStore((s) => s.setSearchOpen);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading, isError } = useSearchNodes(debouncedQ);

  const results = data ?? [];
  const isPending = q.trim().length >= 2 && debouncedQ !== q.trim();
  const showHint = q.trim() === "";
  const showLoading = isLoading || isPending;
  const showNoResults = !showHint && !showLoading && results.length === 0;
  const showResults = !showHint && !showLoading && results.length > 0;

  const run = (ids: string[]) => {
    if (ids.length === 1) {
      selectNode(ids[0]);
      setPanIntent({ nodeId: ids[0] });
      setSearchOpen(false);
      setQ("");
    } else if (ids.length > 1) {
      flashNodes(ids);
      pushToast({ tone: "info", message: `${ids.length} matches flash on the canvas` });
      setQ("");
    }
  };

  const handleEnter = () => {
    const trimmed = q.trim();
    if (trimmed.length < 2) return;
    if (debouncedQ !== trimmed) {
      setDebouncedQ(trimmed);
    } else {
      run(results.map((r) => r.id));
    }
  };

  return (
    <ModalShell title="Search" onClose={() => setSearchOpen(false)} className="w-[640px] max-w-[95vw]">
      <div>
        <div className="flex items-center gap-3 rounded-xl border bg-surface-warm px-4 py-3">
          <Search size={16} className="text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleEnter();
            }}
            placeholder="Search people, places, stories…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="mt-3">
          {showHint ? (
            <div className="px-2 py-6 text-center text-xs text-muted-foreground">
              Try &ldquo;mill&rdquo;, &ldquo;kalyvia&rdquo; or &ldquo;church&rdquo;
            </div>
          ) : showLoading ? (
            <div className="px-2 py-6 text-center text-xs text-muted-foreground">
              Searching…
            </div>
          ) : isError ? (
            <div className="px-2 py-6 text-center text-xs text-muted-foreground">
              Search unavailable — try again
            </div>
          ) : showNoResults ? (
            <div className="px-2 py-6 text-center text-xs text-muted-foreground">
              No matches — nothing lives here yet
            </div>
          ) : showResults ? (
            <div className="flex flex-col gap-1">
              {results.map((r) => {
                const meta = TYPE_META[r.type as keyof typeof TYPE_META];
                return (
                  <button
                    key={r.id}
                    onClick={() => run([r.id])}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm hover:bg-surface-warm"
                  >
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white"
                      style={{ backgroundColor: meta?.color ?? "#999" }}
                    >
                      {meta?.glyph ?? "?"}
                    </span>
                    <span className="font-medium">{r.label}</span>
                    {r.subtitle && <span className="ml-auto text-muted-foreground">{r.subtitle}</span>}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </ModalShell>
  );
}
