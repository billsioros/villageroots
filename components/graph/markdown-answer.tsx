"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Citation } from "@/lib/graph/types";
import { LOW_RELEVANCE_THRESHOLD } from "@/lib/graph/citations";
import { useGraphStore } from "@/store/graphStore";
import { toMarkdownWithCitations, CitationPill } from "./citation";

export function MarkdownAnswer({
  content,
  citations,
}: {
  content: string;
  citations: Citation[];
}) {
  const focusSubgraph = useGraphStore((s) => s.focusSubgraph);
  const litPath = useGraphStore((s) => s.litPath);
  const source = toMarkdownWithCitations(content, citations.length);

  return (
    <div className="space-y-2 text-sm leading-relaxed text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }: { children?: React.ReactNode }) => <p className="mt-0">{children}</p>,
          ul: ({ children }: { children?: React.ReactNode }) => <ul className="ml-4 list-disc">{children}</ul>,
          ol: ({ children }: { children?: React.ReactNode }) => <ol className="ml-4 list-decimal">{children}</ol>,
          li: ({ children }: { children?: React.ReactNode }) => <li className="mt-0.5 leading-relaxed">{children}</li>,
          a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
            if (href?.startsWith("#cite-")) {
              const idx = Number(href.slice(6));
              const citation = citations[idx - 1];
              if (!citation) return <span>{children}</span>;
              const lowRelevance =
                citation.origin === "retrieved" && citation.similarity < LOW_RELEVANCE_THRESHOLD;
              return (
                <CitationPill
                  label={citation.label}
                  lowRelevance={lowRelevance}
                  onClick={() => {
                    litPath({ nodeIds: [citation.nodeId], edgeIds: [] });
                    focusSubgraph([citation.nodeId]);
                  }}
                />
              );
            }
            return (
              <a href={href} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
                {children}
              </a>
            );
          },
          strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold">{children}</strong>,
          code: ({ children }: { children?: React.ReactNode }) => (
            <code className="rounded bg-surface-warm px-1 py-0.5 text-[0.85em]">{children}</code>
          ),
          pre: ({ children }: { children?: React.ReactNode }) => (
            <pre className="overflow-x-auto rounded-lg bg-surface-warm p-3 text-[0.85em]">{children}</pre>
          ),
          blockquote: ({ children }: { children?: React.ReactNode }) => (
            <blockquote className="border-l-2 border-primary/40 pl-3 italic text-muted-foreground">{children}</blockquote>
          ),
          h1: ({ children }: { children?: React.ReactNode }) => <h1 className="text-base font-semibold">{children}</h1>,
          h2: ({ children }: { children?: React.ReactNode }) => <h2 className="text-[15px] font-semibold">{children}</h2>,
          h3: ({ children }: { children?: React.ReactNode }) => <h3 className="text-sm font-semibold">{children}</h3>,
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
