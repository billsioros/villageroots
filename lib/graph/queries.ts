"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAllNodes, fetchAllEdges } from "@/lib/graph/api";

export function useGraphNodes() {
  return useQuery({
    queryKey: ["graph", "nodes"],
    queryFn: fetchAllNodes,
  });
}

export function useGraphEdges() {
  return useQuery({
    queryKey: ["graph", "edges"],
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
