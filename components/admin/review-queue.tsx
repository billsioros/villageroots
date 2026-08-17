"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModerationHistory } from "@/components/admin/moderation-history";
import { invalidationKeys } from "@/lib/graph/queries";
import { useGraphStore } from "@/store/graphStore";
import { ModalShell } from "@/components/graph/modals";

type ApiType = "nodes" | "edges" | "scan_uploads";

interface ReviewItem {
  id: string;
  kind: string;
  title: string;
  subtitle?: string | null;
  body?: string | null;
  status: string;
  submitter?: string | null;
}

interface ReviewCounts {
  nodes: number;
  edges: number;
  scan_uploads: number;
}

interface ReviewQueueResponse {
  items: ReviewItem[];
  counts: ReviewCounts;
}

interface ModerationPayload {
  action: "approve" | "reject";
  reason?: string;
}

type Tab = "nodes" | "edges" | "media";

const TABS: Tab[] = ["nodes", "edges", "media"];

const TAB_LABELS: Record<Tab, string> = {
  nodes: "Nodes",
  edges: "Edges",
  media: "Media",
};

const API_KEY_BY_TAB: Record<Tab, ApiType> = {
  nodes: "nodes",
  edges: "edges",
  media: "scan_uploads",
};

async function fetchQueue(type: ApiType): Promise<ReviewQueueResponse> {
  const res = await fetch(`/api/admin/review?type=${type}`);
  if (!res.ok) throw new Error(`Review fetch failed: ${res.status}`);
  return (await res.json()) as ReviewQueueResponse;
}

export function AdminReviewQueue() {
  const queryClient = useQueryClient();
  const open = useGraphStore((s) => s.reviewQueueOpen);
  const setOpen = useGraphStore((s) => s.setReviewQueueOpen);
  const [tab, setTab] = useState<Tab>("nodes");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<{ type: string; id: string } | null>(
    null,
  );
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const apiKey = API_KEY_BY_TAB[tab];
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-review", tab],
    queryFn: () => fetchQueue(apiKey),
  });

  const selectedIds = Array.from(selected);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const moderate = async (
    id: string,
    action: "approve" | "reject",
    reason?: string,
  ) => {
    const payload: ModerationPayload = { action };
    if (reason) payload.reason = reason;
    const res = await fetch(`/api/moderation/${apiKey}/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Moderation failed: ${res.status}`);
    await res.json();
    await refetch();
    await queryClient.invalidateQueries({ queryKey: invalidationKeys.nodes });
    await queryClient.invalidateQueries({ queryKey: invalidationKeys.edges });
  };

  const approve = async (id: string) => {
    try {
      await moderate(id, "approve");
    } catch {
      // ignore individual failures
    }
  };

  const startReject = (id: string) => {
    setRejectReason("");
    setRejectFor(id);
  };

  const confirmReject = async (id: string) => {
    try {
      const reason = rejectReason.trim() || undefined;
      await moderate(id, "reject", reason);
    } catch {
      // ignore individual failures
    } finally {
      setRejectFor(null);
      setRejectReason("");
    }
  };

  const cancelReject = () => {
    setRejectFor(null);
    setRejectReason("");
  };

  const moderateSelected = async (action: "approve" | "reject") => {
    for (const id of selectedIds) {
      try {
        await moderate(id, action);
      } catch {
        // ignore individual failures
      }
    }
    setSelected(new Set());
  };

  const clearSelection = () => {
    setSelected(new Set());
  };

  const selectTab = (t: Tab) => {
    setTab(t);
    setSelected(new Set());
  };

  if (!open) return null;

  return (
    <ModalShell title="Review Queue" onClose={() => setOpen(false)}>
      <div className="flex flex-col gap-4 max-h-[70vh] w-[600px]">
      <div className="flex gap-2">
        {TABS.map((t) => (
          <Button
            key={t}
            variant={tab === t ? "default" : "outline"}
            onClick={() => selectTab(t)}
            className="gap-2"
          >
            {TAB_LABELS[t]}
            <Badge variant="secondary">
              {data?.counts?.[API_KEY_BY_TAB[t]] ?? 0}
            </Badge>
          </Button>
        ))}
      </div>

      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
          <span className="text-sm text-muted-foreground">
            {selectedIds.length} selected
          </span>
          <Button size="sm" onClick={() => moderateSelected("approve")}>
            Approve
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => moderateSelected("reject")}
          >
            Reject
          </Button>
          <Button variant="ghost" size="sm" onClick={clearSelection}>
            Clear
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : isError ? (
        <p className="text-sm text-destructive">Failed to load review queue.</p>
      ) : data && data.items.length > 0 ? (
        <ul className="flex flex-col gap-3 overflow-y-auto">
          {data.items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 rounded-lg border bg-card p-4"
            >
              <div className="flex items-start gap-3">
                <div className="pt-0.5">
                  <Checkbox
                    checked={selected.has(item.id)}
                    onCheckedChange={() => toggleSelect(item.id)}
                    aria-label={`Select ${item.title}`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium leading-tight">{item.title}</h3>
                  {item.subtitle && (
                    <p className="text-sm text-muted-foreground">
                      {item.subtitle}
                    </p>
                  )}
                  {item.body && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-3">
                      {item.body}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    by {item.submitter ?? "anonymous"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActive({ type: API_KEY_BY_TAB[tab], id: item.id })}
                  >
                    History
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => startReject(item.id)}
                  >
                    Reject
                  </Button>
                  <Button size="sm" onClick={() => approve(item.id)}>
                    Approve
                  </Button>
                </div>
              </div>
              {rejectFor === item.id && (
                <div className="flex items-center gap-2">
                  <Label htmlFor={`reason-${item.id}`} className="sr-only">
                    Rejection reason
                  </Label>
                  <Input
                    id={`reason-${item.id}`}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Optional reason"
                    className="h-8"
                  />
                  <Button size="sm" onClick={() => confirmReject(item.id)}>
                    Confirm
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelReject}>
                    Cancel
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No items to review.</p>
      )}

      {active && (
        <ModerationHistory
          type={active.type}
          id={active.id}
          onClose={() => setActive(null)}
        />
      )}
    </div>
    </ModalShell>
  );
}
