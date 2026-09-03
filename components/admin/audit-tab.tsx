"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

interface AuditLogItem {
  id: string;
  actorId: string;
  entityType: string;
  entityId: string;
  entitySlug: string;
  action: string;
  statusBefore: string | null;
  statusAfter: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actorEmail: string | null;
}

const ACTION_STYLES: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  update: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  status_change: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};

const ENTITY_STYLES: Record<string, string> = {
  node: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  edge: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
};

function formatAction(action: string): string {
  switch (action) {
    case "create": return "Created";
    case "update": return "Updated";
    case "status_change": return "Status changed";
    default: return action;
  }
}

function formatEntityType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString();
}

function describeItem(item: AuditLogItem): string {
  if (item.action === "status_change" && item.statusBefore && item.statusAfter) {
    return `${item.statusBefore} → ${item.statusAfter}`;
  }
  if (item.action === "update") {
    const fields = Object.keys(item.metadata ?? {});
    return fields.length > 0 ? `Changed: ${fields.join(", ")}` : "Updated";
  }
  return item.entitySlug || item.entityId;
}

export function AuditTab() {
  const [actorFilter, setActorFilter] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const params = new URLSearchParams();
  if (actorFilter) params.set("actorId", actorFilter);
  if (entityTypeFilter) params.set("entityType", entityTypeFilter);
  if (actionFilter) params.set("action", actionFilter);
  params.set("limit", "50");

  const { data, isLoading } = useQuery<{ items: AuditLogItem[] }>({
    queryKey: ["admin-audit", actorFilter, entityTypeFilter, actionFilter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/audit?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json();
    },
  });

  const items = data?.items ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-medium">Audit Log</h3>
        <p className="text-xs text-muted-foreground">
          Graph mutations — who changed what and when
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Filter by user ID..."
          value={actorFilter}
          onChange={(e) => setActorFilter(e.target.value)}
          className="flex-1 rounded-md border border-border-soft bg-card px-3 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <select
          value={entityTypeFilter}
          onChange={(e) => setEntityTypeFilter(e.target.value)}
          className="rounded-md border border-border-soft bg-card px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">All types</option>
          <option value="node">Nodes</option>
          <option value="edge">Edges</option>
        </select>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-md border border-border-soft bg-card px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">All actions</option>
          <option value="create">Created</option>
          <option value="update">Updated</option>
          <option value="status_change">Status changed</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-soft p-6 text-center">
          <p className="text-xs text-muted-foreground">No audit entries found</p>
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-lg border border-border-soft bg-card px-3 py-2 text-xs"
            >
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {item.actorEmail ?? item.actorId.slice(0, 8)}
              </span>
              <Badge
                variant="secondary"
                className={`shrink-0 text-[10px] ${ACTION_STYLES[item.action] ?? ""}`}
              >
                {formatAction(item.action)}
              </Badge>
              <Badge
                variant="secondary"
                className={`shrink-0 text-[10px] ${ENTITY_STYLES[item.entityType] ?? ""}`}
              >
                {formatEntityType(item.entityType)}
              </Badge>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {describeItem(item)}
              </span>
              <span className="shrink-0 text-muted-foreground/60">
                {formatTime(item.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
