"use client";

export interface SearchResult {
  id: string;
  label: string;
  subtitle: string | null;
  type: string;
  rank: number;
}

export interface SearchResponse {
  results: SearchResult[];
}

export async function fetchSearchNodes(q: string, limit = 8): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q, limit: String(limit) });
  const res = await fetch(`/api/graph/search?${params}`);
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  const data: SearchResponse = await res.json();
  return data.results;
}
