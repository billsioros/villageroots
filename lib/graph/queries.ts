"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { fetchAllNodes, fetchAllEdges } from "@/lib/graph/api";
import { fetchSearchNodes } from "@/lib/graph/search";

export const invalidationKeys = {
  nodes: ["graph", "nodes"] as const,
  edges: ["graph", "edges"] as const,
  review: ["admin-review"] as const,
};

export function useGraphNodes() {
  return useQuery({
    queryKey: invalidationKeys.nodes,
    queryFn: fetchAllNodes,
  });
}

export function useGraphEdges() {
  return useQuery({
    queryKey: invalidationKeys.edges,
    queryFn: fetchAllEdges,
  });
}

export function useGraphData() {
  const nodes = useGraphNodes();
  const edges = useGraphEdges();
  const isLoading = nodes.isLoading || edges.isLoading;
  const isError = nodes.isError || edges.isError;
  const error = nodes.error ?? edges.error;
  const refetch = () => Promise.all([nodes.refetch(), edges.refetch()]);
  const data =
    nodes.data && edges.data
      ? { nodes: nodes.data, edges: edges.data }
      : undefined;
  return { data, isLoading, isError, error, refetch };
}

export function useSearchNodes(q: string) {
  return useQuery({
    queryKey: ["graph", "search", q],
    queryFn: () => fetchSearchNodes(q),
    enabled: q.trim().length >= 2,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}
