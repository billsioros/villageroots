"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Download, KeyRound, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useGraphStore } from "@/store/graphStore";
import { getInitials } from "@/lib/utils/user-profile";
import { ModalShell } from "./modals";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UserInfo {
  email: string;
}

export function ProfileModal() {
  const router = useRouter();
  const open = useGraphStore((s) => s.profileOpen);
  const setOpen = useGraphStore((s) => s.setProfileOpen);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSaveError(null);
    setSaveMessage(null);
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      const email = u.email ?? "";
      const meta = u.user_metadata ?? {};
      const initialName = typeof meta.name === "string" ? meta.name : "";
      const initialSurname = typeof meta.surname === "string" ? meta.surname : "";
      setName(initialName);
      setSurname(initialSurname);
      setUser({ email });
    });
    fetch("/api/me/role")
      .then((r) => r.json())
      .then((d) => setRole(d.role))
      .catch(() => setRole(null));
  }, [open]);

  const initials =
    getInitials(name, surname) || (user?.email ? user.email.charAt(0).toUpperCase() : "");

  const handleSave = useCallback(async () => {
    setSaveError(null);
    setSaveMessage(null);
    if (!name.trim()) {
      setSaveError("Name is required.");
      return;
    }
    if (!surname.trim()) {
      setSaveError("Surname is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), surname: surname.trim() }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setSaveError(body.error ?? "We couldn't save your profile — please try again.");
        return;
      }
      setName(name.trim());
      setSurname(surname.trim());
      setSaveMessage("Profile updated.");
    } catch {
      setSaveError("We couldn't save your profile — please try again.");
    } finally {
      setSaving(false);
    }
  }, [name, surname]);

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
          {initials || "…"}
        </div>

        <div className="flex w-full flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="profile-name">First name</Label>
              <Input
                id="profile-name"
                type="text"
                autoComplete="given-name"
                value={name}
                disabled={saving}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="profile-surname">Surname</Label>
              <Input
                id="profile-surname"
                type="text"
                autoComplete="family-name"
                value={surname}
                disabled={saving}
                onChange={(e) => setSurname(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-center">
            <p className="truncate text-sm text-muted-foreground">{user?.email ?? "…"}</p>
            {role && (
              <Badge
                variant={role === "admin" ? "default" : "secondary"}
                className="px-3 py-1 text-sm"
              >
                {role === "admin" ? "Admin" : "Contributor"}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex w-full flex-col gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />}
            Save Profile
          </Button>
          <div className="min-h-[1.25rem] text-center">
            {saveError ? (
              <p className="text-[13px] text-destructive">{saveError}</p>
            ) : saveMessage ? (
              <p className="text-[13px] text-foreground">{saveMessage}</p>
            ) : null}
          </div>
          <div className="flex gap-4">
            <Button className="flex-1" onClick={handleExport} disabled={exporting}>
              {exporting ? (
                <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Download className="mr-2 h-5 w-5" />
              )}
              Export Data
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleChangePassword}>
              <KeyRound className="mr-2 h-5 w-5" />
              Change Password
            </Button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}