"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Users, ListChecks, History } from "lucide-react";
import { useGraphStore } from "@/store/graphStore";
import { ModalShell } from "@/components/graph/modals";
import { ReviewQueueTab } from "@/components/admin/review-queue-tab";
import { UserManagementTab } from "@/components/admin/user-management-tab";
import { AuditTab } from "@/components/admin/audit-tab";

interface TabDef {
  id: "users" | "review" | "audit";
  label: string;
  icon: typeof Users;
  component: () => ReactNode;
}

const TABS: TabDef[] = [
  { id: "users", label: "User Management", icon: Users, component: UserManagementTab },
  { id: "review", label: "Review Queue", icon: ListChecks, component: ReviewQueueTab },
  { id: "audit", label: "Audit Log", icon: History, component: AuditTab },
];

export function AdminDialog() {
  const open = useGraphStore((s) => s.adminDialogOpen);
  const setOpen = useGraphStore((s) => s.setAdminDialogOpen);
  const tab = useGraphStore((s) => s.adminDialogTab);
  const setTab = useGraphStore((s) => s.setAdminDialogTab);

  const [focusedTab, setFocusedTab] = useState(0);

  useEffect(() => {
    if (open) setFocusedTab(TABS.findIndex((t) => t.id === tab));
  }, [open, tab]);

  if (!open) return null;

  const activeTab = TABS.find((t) => t.id === tab) ?? TABS[0];
  const ActiveComponent = activeTab.component;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const dir = e.key === "ArrowDown" ? 1 : -1;
    const next = (focusedTab + dir + TABS.length) % TABS.length;
    animateTo(next);
  };

  const animateTo = (index: number) => {
    setFocusedTab(index);
    const target = TABS[index];
    if (target) setTab(target.id);
  };

  return (
    <ModalShell
      title="Admin"
      onClose={() => setOpen(false)}
      className="w-[820px] max-w-[95vw] p-0"
    >
      <div className="flex h-[560px] overflow-hidden">
        <div
          role="tablist"
          aria-orientation="vertical"
          aria-label="Admin sections"
          onKeyDown={onKeyDown}
          className="flex w-[200px] shrink-0 flex-col gap-1 border-r border-border-soft bg-muted/30 p-3"
        >
          {TABS.map((t, i) => {
            const Icon = t.icon;
            const selected = t.id === tab;
            const tabRef = (el: HTMLButtonElement | null) => {
              if (el && selected) {
                el.focus();
              }
            };
            return (
              <button
                key={t.id}
                ref={tabRef}
                role="tab"
                id={`admin-tab-${t.id}`}
                aria-selected={selected}
                aria-controls={`admin-panel-${t.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => animateTo(i)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  selected
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon size={16} className="shrink-0" />
                {t.label}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={`admin-panel-${tab}`}
          aria-labelledby={`admin-tab-${tab}`}
          tabIndex={0}
          className="min-w-0 flex-1 overflow-y-auto p-5"
        >
          <ActiveComponent />
        </div>
      </div>
    </ModalShell>
  );
}