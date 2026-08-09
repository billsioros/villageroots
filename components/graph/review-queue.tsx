"use client";

import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGraphStore } from "@/store/graphStore";
import type { ReviewKind } from "@/lib/graph/types";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "relation", label: "Relations" },
  { id: "node", label: "Nodes" },
  { id: "ocr", label: "OCR" },
] as const;

const KIND_LABEL: Record<ReviewKind, string> = {
  relation: "Relation",
  node: "Node",
  ocr: "OCR",
};

export function ReviewQueue() {
  const open = useGraphStore((s) => s.reviewOpen);
  const setReviewOpen = useGraphStore((s) => s.setReviewOpen);
  const queue = useGraphStore((s) => s.reviewQueue);
  const resolveReview = useGraphStore((s) => s.resolveReview);
  const pushToast = useGraphStore((s) => s.pushToast);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  if (!open) return null;

  const items = queue.filter((r) => filter === "all" || r.kind === filter);

  return (
    <div className="absolute right-5 top-5 z-40 flex max-h-[calc(100vh-140px)] w-[360px] flex-col rounded-2xl border bg-card shadow-elev-raised">
      <div className="flex items-center gap-2 px-4 py-3.5">
        <button
          onClick={() => setReviewOpen(false)}
          className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-surface-warm"
          aria-label="Back"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="text-[13px] font-semibold">Review queue</div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          {queue.length}
        </span>
      </div>
      <div className="flex gap-1.5 px-4 pb-3">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3 py-1 text-[12px] font-medium ${
              filter === f.id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-surface-warm"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {items.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-muted-foreground">Queue is clear</div>
        ) : (
          items.map((r) => (
            <div key={r.id} className="mb-2.5 rounded-xl border p-3.5">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  {KIND_LABEL[r.kind]}
                </span>
                <span className="ml-auto text-[11px] text-muted-foreground">{r.who}</span>
              </div>
              <div className="mt-1.5 text-[13px] font-medium leading-snug">{r.title}</div>
              <div className="mt-0.5 text-[12px] text-muted-foreground">{r.body}</div>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1 rounded-full"
                  onClick={() => {
                    resolveReview(r.id);
                    pushToast({ tone: "success", message: "Review resolved" });
                  }}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1 rounded-full text-destructive"
                  onClick={() => {
                    resolveReview(r.id);
                    pushToast({ tone: "error", message: "Review rejected" });
                  }}
                >
                  Reject
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
