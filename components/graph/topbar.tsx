"use client";

import { ChevronRight } from "lucide-react";
import { BrandMark } from "./brand-mark";
import { LogoutButton } from "@/components/logout-button";
import { NotificationBell } from "./notification-bell";

export function Topbar() {
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
        <NotificationBell />
        <div className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-[11px] font-semibold text-background">
          EK
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}
