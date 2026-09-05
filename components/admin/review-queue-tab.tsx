"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModerationHistory } from "@/components/admin/moderation-history";
import { invalidationKeys } from "@/lib/graph/queries";

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

export function ReviewQueueTab() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("nodes");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<{ type: string; id: string } | null>(
    null,
  );
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const nodesQuery = useQuery({
    queryKey: ["admin-review", "nodes"],
    queryFn: () => fetchQueue("nodes"),
  });
  const edgesQuery = useQuery({
    queryKey: ["admin-review", "edges"],
    queryFn: () => fetchQueue("edges"),
  });
  const mediaQuery = useQuery({
    queryKey: ["admin-review", "scan_uploads"],
    queryFn: () => fetchQueue("scan_uploads"),
  });

  const queriesByTab = useMemo<Record<Tab, typeof nodesQuery>>(
    () => ({ nodes: nodesQuery, edges: edgesQuery, media: mediaQuery }),
    [nodesQuery, edgesQuery, mediaQuery],
  );

  const activeQuery = queriesByTab[tab];
  const data = activeQuery.data;
  const isLoading = activeQuery.isLoading;
  const isError = activeQuery.isError;
  const refetch = activeQuery.refetch;
  const apiKey = API_KEY_BY_TAB[tab];

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

  useEffect(() => {
    const q = queriesByTab[tab];
    if (q.data === undefined && !q.isLoading) q.refetch();
  }, [tab, queriesByTab]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Review Queue</h3>
        <p className="text-xs text-muted-foreground">
          Pending moderation — approve before the public graph updates
        </p>
      </div>

      <div className="flex gap-3">
        {TABS.map((t) => (
          <Button
            key={t}
            variant={tab === t ? "default" : "outline"}
            onClick={() => selectTab(t)}
            className="gap-2"
          >
            {TAB_LABELS[t]}
            <Badge variant="secondary">
              {queriesByTab[t].data?.counts?.[API_KEY_BY_TAB[t]] ?? 0}
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

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : isError ? (
          <p className="text-sm text-destructive">Failed to load review queue.</p>
        ) : data && data.items.length > 0 ? (
          <ul className="flex flex-col gap-4">
            {data.items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 rounded-lg border bg-card p-5"
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
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-soft p-8 text-center">
            <p className="text-sm text-muted-foreground">No items to review.</p>
          </div>
        )}
      </div>

      {active && (
        <ModerationHistory
          type={active.type}
          id={active.id}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
}