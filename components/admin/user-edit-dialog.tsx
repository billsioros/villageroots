"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { ModalShell } from "@/components/graph/modals";
import { getDisplayName } from "@/lib/utils/user-profile";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/graph/rbac";

export interface ManagedUser {
  id: string;
  email: string;
  name: string | null;
  surname: string | null;
  role: string;
  is_active: boolean;
}

export interface UserPatch {
  name?: string;
  surname?: string;
  role?: Role;
  isActive?: boolean;
}

export function buildUserPatch(
  name: string,
  surname: string,
  role: Role,
  active: boolean,
  user: ManagedUser,
): UserPatch {
  const patch: UserPatch = {};
  if (name !== user.name || surname !== user.surname) {
    patch.name = name;
    patch.surname = surname;
  }
  if (role !== user.role) patch.role = role;
  if (active !== user.is_active) patch.isActive = active;
  return patch;
}

export function UserEditDialog({
  user,
  isSelf,
  isSaving,
  onClose,
  onSave,
}: {
  user: ManagedUser;
  isSelf: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (patch: UserPatch) => void;
}) {
  const [name, setName] = useState(user.name ?? "");
  const [surname, setSurname] = useState(user.surname ?? "");
  const [role, setRole] = useState<Role>(user.role === "admin" ? "admin" : "contributor");
  const [active, setActive] = useState<boolean>(user.is_active);
  const [error, setError] = useState<string | null>(null);

  const displayName = getDisplayName(user.name ?? "", user.surname ?? "");

  const handleSave = () => {
    const trimmedName = name.trim();
    const trimmedSurname = surname.trim();
    if (!trimmedName) {
      setError("Name is required.");
      return;
    }
    if (!trimmedSurname) {
      setError("Surname is required.");
      return;
    }
    setError(null);

    const patch = buildUserPatch(trimmedName, trimmedSurname, role, active, user);
    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    onSave(patch);
  };

  return (
    <ModalShell title={`Editing ${displayName || user.email}`} onClose={onClose} className="w-full max-w-md">
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="edit-first-name">First name</Label>
            <Input
              id="edit-first-name"
              type="text"
              autoComplete="given-name"
              value={name}
              disabled={isSaving}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-surname">Surname</Label>
            <Input
              id="edit-surname"
              type="text"
              autoComplete="family-name"
              value={surname}
              disabled={isSaving}
              onChange={(e) => setSurname(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="text-[13px] text-destructive">{error}</p>}

        <div className="grid gap-1.5">
          <Label>Role</Label>
          <RadioGroup
            value={role}
            onValueChange={(v) => setRole(v as Role)}
            disabled={isSelf || isSaving}
            className="grid grid-cols-2 gap-2"
          >
            <RadioGroupItem value="admin" id="edit-role-admin" className="sr-only" />
            <Label
              htmlFor="edit-role-admin"
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                role === "admin"
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border-soft text-muted-foreground",
              )}
            >
              <ShieldCheck size={14} />
              Administrator
            </Label>
            <RadioGroupItem value="contributor" id="edit-role-contributor" className="sr-only" />
            <Label
              htmlFor="edit-role-contributor"
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                role === "contributor"
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border-soft text-muted-foreground",
              )}
            >
              Contributor
            </Label>
          </RadioGroup>
          {isSelf && (
            <p className="text-xs text-muted-foreground">You cannot change your own role.</p>
          )}
        </div>

        <div className="grid gap-1.5">
          <div className="flex items-center justify-between rounded-lg border border-border-soft px-3 py-2.5">
            <div>
              <Label htmlFor="edit-active" className="text-sm font-medium">
                Active account
              </Label>
              <p className="text-xs text-muted-foreground">
                {active ? "User can sign in" : "User is blocked from signing in"}
              </p>
            </div>
            <Switch
              id="edit-active"
              checked={active}
              onCheckedChange={setActive}
              disabled={isSelf || isSaving}
              aria-label="Active account"
            />
          </div>
          {isSelf && (
            <p className="text-xs text-muted-foreground">You cannot deactivate your own account.</p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
