"use client";

import { useEffect, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGraphData } from "@/lib/graph/queries";
import { useGraphStore } from "@/store/graphStore";
import { nodeRowToGraph, edgeRowToGraph } from "@/lib/graph/mappers";

export function GraphLoader({ children }: { children: ReactNode }) {
  const { data, isLoading, isError, error, refetch } = useGraphData();
  const hydrateGraph = useGraphStore((s) => s.hydrateGraph);

  useEffect(() => {
    if (data) {
      hydrateGraph(data.nodes.map(nodeRowToGraph), data.edges.map(edgeRowToGraph));
    }
  }, [data, hydrateGraph]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full w-full flex-1 flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">Couldn't load the knowledge graph.</p>
        {error instanceof Error && (
          <p className="max-w-sm text-center text-xs text-muted-foreground/70">{error.message}</p>
        )}
        <Button size="sm" className="rounded-full" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
