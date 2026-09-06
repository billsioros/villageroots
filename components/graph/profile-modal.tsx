"use client";

import { useEffect, useState, useCallback } from "react";
import { LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useGraphStore } from "@/store/graphStore";
import { getInitials, getDisplayName } from "@/lib/utils/user-profile";
import { ModalShell } from "./modals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileModal() {
  const open = useGraphStore((s) => s.profileOpen);
  const setOpen = useGraphStore((s) => s.setProfileOpen);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
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
      setEmail(u.email ?? "");
      const meta = u.user_metadata ?? {};
      setName(typeof meta.name === "string" ? meta.name : "");
      setSurname(typeof meta.surname === "string" ? meta.surname : "");
    });
  }, [open]);

  const initials =
    getInitials(name, surname) || (email ? email.charAt(0).toUpperCase() : "");
  const displayName = getDisplayName(name, surname) || email || "…";

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

  if (!open) return null;

  return (
    <ModalShell
      title="Profile"
      onClose={() => setOpen(false)}
      className="w-[480px]"
    >
      <div className="flex min-h-[340px] flex-col py-2">
        <div className="flex flex-col items-center">
          <div className="seal-stamp grid h-24 w-24 place-items-center rounded-full bg-foreground text-3xl font-semibold text-background">
            {initials || "…"}
          </div>

          <p className="mt-5 text-[26px] font-semibold leading-tight tracking-tight text-foreground">
            {displayName}
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">{email || "…"}</p>
        </div>

        <div className="mt-9 grid grid-cols-2 gap-5">
          <div className="grid gap-1.5">
            <Label
              htmlFor="profile-name"
              className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground"
            >
              First name
            </Label>
            <Input
              id="profile-name"
              type="text"
              autoComplete="given-name"
              value={name}
              disabled={saving}
              className="h-10 rounded-none border-0 border-b border-input bg-transparent px-0 text-[15px] shadow-none focus-visible:border-foreground focus-visible:ring-0"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label
              htmlFor="profile-surname"
              className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground"
            >
              Surname
            </Label>
            <Input
              id="profile-surname"
              type="text"
              autoComplete="family-name"
              value={surname}
              disabled={saving}
              className="h-10 rounded-none border-0 border-b border-input bg-transparent px-0 text-[15px] shadow-none focus-visible:border-foreground focus-visible:ring-0"
              onChange={(e) => setSurname(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-3 pt-5">
          <Button onClick={handleSave} disabled={saving} className="h-11 w-full text-sm">
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
        </div>
      </div>
    </ModalShell>
  );
}