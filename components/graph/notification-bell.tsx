"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, CheckCircle2, XCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Notification {
  id: string;
  type: "submission_approved" | "submission_rejected";
  message: string;
  read: boolean;
  createdAt: string;
  metadata: { submission_id?: string; node_count?: number } | null;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // silent — will retry on next open
    }
  }, []);

  // Fetch on mount and when dropdown opens
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  const markAsRead = async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      const res = await fetch(`/api/notifications/${id}`, { method: "PATCH" });
      if (!res.ok) {
        // Rollback on failure
        fetchNotifications();
      }
    } catch {
      fetchNotifications();
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative grid h-9 w-9 place-items-center rounded-full border bg-secondary hover:bg-surface-warm"
          aria-label="Notifications"
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[320px] max-h-[400px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="px-4 py-6 text-center text-[13px] text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          notifications.map((n) => (
            <DropdownMenuItem
              key={n.id}
              onSelect={() => markAsRead(n.id)}
              className={`flex items-start gap-3 px-4 py-3 cursor-pointer ${
                !n.read ? "bg-primary/5" : ""
              }`}
            >
              <span className="mt-0.5 shrink-0">
                {n.type === "submission_approved" ? (
                  <CheckCircle2 size={15} className="text-success" />
                ) : (
                  <XCircle size={15} className="text-destructive" />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] leading-snug">{n.message}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(n.createdAt)}</p>
              </div>
              {!n.read && (
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
