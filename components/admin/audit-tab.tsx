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
  create: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200",
  update: "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-200",
  status_change: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200",
};

const ENTITY_STYLES: Record<string, string> = {
  node: "border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-200",
  edge: "border-cyan-300 bg-cyan-50 text-cyan-800 dark:border-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-200",
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
    <div className="flex h-full flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Audit Log</h3>
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
          className="flex-1 rounded-md border border-border-soft bg-card px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <select
          value={entityTypeFilter}
          onChange={(e) => setEntityTypeFilter(e.target.value)}
          className="rounded-md border border-border-soft bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">All types</option>
          <option value="node">Nodes</option>
          <option value="edge">Edges</option>
        </select>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-md border border-border-soft bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">All actions</option>
          <option value="create">Created</option>
          <option value="update">Updated</option>
          <option value="status_change">Status changed</option>
        </select>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-soft p-8 text-center">
            <p className="text-sm text-muted-foreground">No audit entries found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded-lg border border-border-soft bg-card px-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {item.actorEmail ?? item.actorId.slice(0, 8)}
                </span>
                <Badge
                  variant="outline"
                  className={`shrink-0 text-xs ${ACTION_STYLES[item.action] ?? ""}`}
                >
                  {formatAction(item.action)}
                </Badge>
                <Badge
                  variant="outline"
                  className={`shrink-0 text-xs ${ENTITY_STYLES[item.entityType] ?? ""}`}
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
    </div>
  );
}
