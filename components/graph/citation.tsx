"use client";

import { Network } from "lucide-react";
import type { Citation } from "@/lib/graph/types";
import { LOW_RELEVANCE_THRESHOLD } from "@/lib/graph/citations";

export type Segment =
  | { type: "text"; value: string }
  | { type: "citation"; index: number; value: string };

const CITATION_REF = /\[(\d+)\]/g;

export function splitAnswerIntoSegments(content: string, count: number): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  CITATION_REF.lastIndex = 0;
  while ((match = CITATION_REF.exec(content)) !== null) {
    const index = Number(match[1]);
    if (index < 1 || index > count) continue;
    if (match.index > last) {
      segments.push({ type: "text", value: content.slice(last, match.index) });
    }
    segments.push({ type: "citation", index, value: match[0] });
    last = match.index + match[0].length;
  }
  if (last < content.length) {
    segments.push({ type: "text", value: content.slice(last) });
  }
  if (segments.length === 0) segments.push({ type: "text", value: content });
  return segments;
}

export type RenderSegment =
  | Segment
  | { type: "citation"; index: number; value: string; label: string; lowRelevance: boolean };

export function renderAnswerWithCitations(content: string, citations: Citation[]): RenderSegment[] {
  const segments = splitAnswerIntoSegments(content, citations.length);
  return segments.map((seg) => {
    if (seg.type !== "citation") return seg;
    const citation = citations[seg.index - 1];
    if (!citation) return { ...seg, label: "", lowRelevance: false };
    const lowRelevance =
      citation.origin === "retrieved" && citation.similarity < LOW_RELEVANCE_THRESHOLD;
    return { ...seg, label: citation.label, lowRelevance };
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
