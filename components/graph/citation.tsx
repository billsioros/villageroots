"use client";

import { Network } from "lucide-react";
import type { Citation } from "@/lib/graph/types";

interface CitationActions {
  selectNode: (id: string | null) => void;
  litPath: (path: { nodeIds: string[]; edgeIds: string[] }) => void;
  focusSubgraph: (nodeIds: string[]) => void;
}

/** Opens the cited node: selects it (side panel), lights it, glides to it. */
export function openCitation(citation: Citation, actions: CitationActions) {
  actions.selectNode(citation.nodeId);
  actions.litPath({ nodeIds: [citation.nodeId], edgeIds: [] });
  actions.focusSubgraph([citation.nodeId]);
}

const CITATION_MARKERS =
  /\[(\d+)\]|<<?CITE\s*:\s*(\d+)\s*>>?|\[CITE\s*:\s*(\d+)\]/gi;

export function toMarkdownWithCitations(content: string, count: number): string {
  if (!content) return "";
  return content.replace(
    CITATION_MARKERS,
    (marker: string, bDigits?: string, cDigits?: string, bcDigits?: string) => {
      const raw = bDigits ?? cDigits ?? bcDigits;
      if (!raw) return marker;
      const index = Number(raw);
      return index >= 1 && index <= count ? `[${index}](#cite-${index})` : marker;
    },
  );
}

export const toMarkdownWithSentinels = toMarkdownWithCitations;

export function CitationPill({
  label,
  lowRelevance,
  onClick,
}: {
  label: string;
  lowRelevance: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={lowRelevance ? "Low evidence confidence" : label}
      className={`mx-0.5 inline-flex max-w-[140px] items-center gap-1 rounded-full border px-1.5 py-0.5 align-baseline text-[11px] font-medium transition-colors hover:border-primary/50 ${
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
