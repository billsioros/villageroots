"use client";

import { Network } from "lucide-react";

const CITATION_REF = /\[(\d+)\]/g;

export function toMarkdownWithSentinels(content: string, count: number): string {
  return content.replace(CITATION_REF, (marker: string, digits: string) => {
    const index = Number(digits);
    return index >= 1 && index <= count ? `<<CITE:${index}>>` : marker;
  });
}

export function CitationPill({ label, lowRelevance }: { label: string; lowRelevance: boolean }) {
  return (
    <button
      type="button"
      title={lowRelevance ? "Low evidence confidence" : label}
      className={`mx-0.5 inline-flex max-w-[140px] items-center gap-1 rounded-full border px-1.5 py-0.5 align-baseline text-[11px] font-medium ${
        lowRelevance
          ? "border-amber-300 bg-amber-50 text-amber-700"
          : "border-primary/30 bg-primary/5 text-primary"
      }`}
    >
      <span className="truncate">{label || "[?]"}</span>
    </button>
  );
}

export function CitationGraphButton({ hasCitations, onClick }: { hasCitations: boolean; onClick: () => void }) {
  if (!hasCitations) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      title="Show sources on the graph"
      aria-label="Show sources on the graph"
      className="mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
    >
      <Network size={13} /> View sources on graph
    </button>
  );
}
