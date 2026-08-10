"use client";

import { useEffect } from "react";
import { useGraphStore } from "@/store/graphStore";

export function HintChip() {
  const hint = useGraphStore((s) => s.hint);
  const dismiss = useGraphStore((s) => s.dismissHint);

  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(dismiss, 8800);
    return () => clearTimeout(t);
  }, [hint, dismiss]);

  if (!hint) return null;

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border bg-card/90 px-5 py-2.5 text-[13px] shadow-elev-raised backdrop-blur">
      Search for <span className="font-semibold">“the mill”</span>, or press{" "}
      <kbd className="rounded-md border bg-surface-warm px-1.5 py-0.5 font-mono text-[11px]">⌘ K</kbd>{" "}
      to find something
    </div>
  );
}
