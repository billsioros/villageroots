"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Download, KeyRound, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useGraphStore } from "@/store/graphStore";
import { ModalShell } from "./modals";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface UserInfo {
  email: string;
  initials: string;
}

function getInitials(email: string): string {
  return email.charAt(0).toUpperCase();
}

export function ProfileModal() {
  const router = useRouter();
  const open = useGraphStore((s) => s.profileOpen);
  const setOpen = useGraphStore((s) => s.setProfileOpen);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      const email = u.email ?? "";
      setUser({ email, initials: getInitials(email) });
    });
    fetch("/api/me/role")
      .then((r) => r.json())
      .then((d) => setRole(d.role))
      .catch(() => setRole(null));
  }, [open]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/me/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="?(.+?)"?$/);
      const filename = match?.[1] ?? "village-roots-data.xlsx";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Silently fail — could add toast notification here
    } finally {
      setExporting(false);
    }
  }, []);

  const handleChangePassword = useCallback(() => {
    setOpen(false);
    router.push("/auth/update-password");
  }, [router, setOpen]);

  if (!open) return null;

  return (
    <ModalShell
      title="Profile"
      onClose={() => setOpen(false)}
      className="w-[480px]"
    >
      <div className="flex flex-col items-center gap-6 py-4">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-foreground text-2xl font-semibold text-background">
          {user?.initials ?? "…"}
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-base text-muted-foreground">{user?.email ?? "…"}</p>
          {role && (
            <Badge
              variant={role === "admin" ? "default" : "secondary"}
              className="px-3 py-1 text-sm"
            >
              {role === "admin" ? "Admin" : "Contributor"}
            </Badge>
          )}
        </div>

        <div className="flex w-full gap-4">
          <Button
            className="flex-1"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Download className="mr-2 h-5 w-5" />
            )}
            Export Data
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleChangePassword}
          >
            <KeyRound className="mr-2 h-5 w-5" />
            Change Password
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
