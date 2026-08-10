"use client";

import { useEffect } from "react";
import { useGraphStore } from "@/store/graphStore";

export function WelcomeCard() {
  const welcome = useGraphStore((s) => s.welcome);
  const dismiss = useGraphStore((s) => s.dismissWelcome);

  useEffect(() => {
    if (!welcome) return;
    const t = setTimeout(dismiss, 8000);
    return () => clearTimeout(t);
  }, [welcome, dismiss]);

  if (!welcome) return null;

  return (
    <div className="absolute left-1/2 top-1/2 w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card/95 p-6 shadow-elev-raised backdrop-blur">
      <h2 className="text-lg font-semibold tracking-tight">Welcome to VillageRoots</h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
        Explore the people, places and stories of your village as a living map. Click any node to
        open its story; drag the canvas to wander.
      </p>
      <button
        onClick={dismiss}
        className="mt-4 w-full rounded-full bg-foreground py-2.5 text-[13px] font-medium text-background hover:opacity-90"
      >
        Explore the map
      </button>
    </div>
  );
}
