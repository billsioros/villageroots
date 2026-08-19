"use client";

import { useQuery } from "@tanstack/react-query";
import { ModalShell } from "@/components/graph/modals";

interface HistoryEntry {
  id: string;
  action: string;
  reason?: string | null;
  moderatedByName?: string | null;
  createdAt: string;
}

interface ModerationHistoryProps {
  type: string;
  id: string;
  onClose: () => void;
}

export function ModerationHistory({
  type,
  id,
  onClose,
}: ModerationHistoryProps) {
  const { data } = useQuery({
    queryKey: ["mod-history", type, id],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/review/history?type=${type}&id=${id}`,
      );
      if (!res.ok) return [] as HistoryEntry[];
      return (await res.json()) as HistoryEntry[];
    },
    retry: false,
  });

  const entries = data ?? [];

  return (
    <ModalShell title="Moderation history" onClose={onClose}>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No history yet for this item.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((entry) => (
            <li key={entry.id} className="flex flex-col gap-1">
              <p className="text-sm">
                <span className="font-medium capitalize">
                  {entry.action}
                </span>{" "}
                by {entry.moderatedByName ?? "admin"} at{" "}
                {new Date(entry.createdAt).toLocaleString()}
              </p>
              {entry.reason && (
                <p className="text-sm text-muted-foreground">
                  {entry.reason}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </ModalShell>
  );
}