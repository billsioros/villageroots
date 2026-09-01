"use client";

import { ChevronRight } from "lucide-react";
import { BrandMark } from "./brand-mark";
import { NotificationBell } from "./notification-bell";
import { AvatarMenu } from "./avatar-menu";

export function Topbar() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b px-5">
      <div className="flex items-center gap-2.5">
        <BrandMark size={22} />
        <span className="text-[15px] font-semibold tracking-tight">VillageRoots</span>
      </div>
      <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
        <span>Fokida</span>
        <ChevronRight size={13} />
        <span className="text-foreground">Potidaneia</span>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <NotificationBell />
        <AvatarMenu />
      </div>
    </header>
  );
}
