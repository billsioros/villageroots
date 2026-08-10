"use client";

import { useState } from "react";
import { Bell, ChevronRight, User } from "lucide-react";
import { BrandMark } from "./brand-mark";
import { LogoutButton } from "@/components/logout-button";
import { useGraphStore } from "@/store/graphStore";

export function Topbar() {
  const queue = useGraphStore((s) => s.reviewQueue);
  const setReviewOpen = useGraphStore((s) => s.setReviewOpen);
  const [notif, setNotif] = useState(true);

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b px-5">
      <div className="flex items-center gap-2.5">
        <BrandMark size={22} />
        <span className="text-[15px] font-semibold tracking-tight">VillageRoots</span>
      </div>
      <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
        <span>Potidaneia</span>
        <ChevronRight size={13} />
        <span className="text-foreground">Fokida</span>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <button
          onClick={() => setNotif(false)}
          className="relative grid h-9 w-9 place-items-center rounded-full border bg-secondary hover:bg-surface-warm"
          aria-label="Notifications"
        >
          <Bell size={16} />
          {notif && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />}
        </button>
        <button
          onClick={() => setReviewOpen(true)}
          className="relative grid h-9 w-9 place-items-center rounded-full border bg-secondary hover:bg-surface-warm"
          aria-label="Review queue"
        >
          <User size={16} />
          {queue.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {queue.length}
            </span>
          )}
        </button>
        <div className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-[11px] font-semibold text-background">
          EK
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}
