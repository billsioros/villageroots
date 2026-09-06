"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InviteForm } from "@/components/auth/invite-form";
import { getInitials, getDisplayName } from "@/lib/utils/user-profile";
import { Check, Pencil, ShieldCheck, X } from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string | null;
  surname: string | null;
  role: string;
  is_active: boolean;
  last_sign_in_at: string | null;
  created_at: string | null;
}

async function fetchUsers(): Promise<User[]> {
  const res = await fetch("/api/admin/users");
  if (!res.ok) throw new Error(`Failed to fetch users: ${res.status}`);
  const body = (await res.json()) as { users: User[] };
  return body.users;
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 rounded-lg border bg-card p-4 animate-pulse">
      <div className="h-9 w-9 rounded-full bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-3 w-48 rounded bg-muted" />
      </div>
      <div className="h-6 w-16 rounded-full bg-muted" />
      <div className="h-8 w-20 rounded bg-muted" />
    </div>
  );
}

function UserCard({
  user,
  onToggle,
  onSaveNames,
  isPending,
  isSavingNames,
}: {
  user: User;
  onToggle: (userId: string, isActive: boolean) => void;
  onSaveNames: (userId: string, name: string, surname: string) => void;
  isPending: boolean;
  isSavingNames: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(user.name ?? "");
  const [draftSurname, setDraftSurname] = useState(user.surname ?? "");
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveAttemptedRef = useRef(false);

  const displayName = getDisplayName(user.name ?? "", user.surname ?? "");
  const initials = getInitials(user.name ?? "", user.surname ?? "") || user.email.slice(0, 2).toUpperCase();

  const savedFullName = getDisplayName(user.name ?? "", user.surname ?? "");
  const draftFullName = getDisplayName(draftName, draftSurname);

  useEffect(() => {
    if (editing && saveAttemptedRef.current && savedFullName !== "" && savedFullName === draftFullName) {
      setEditing(false);
      setSaveError(null);
      saveAttemptedRef.current = false;
    }
  }, [editing, savedFullName, draftFullName]);

  const startEdit = () => {
    setDraftName(user.name ?? "");
    setDraftSurname(user.surname ?? "");
    setSaveError(null);
    saveAttemptedRef.current = false;
    setEditing(true);
  };

  const cancelEdit = () => {
    setSaveError(null);
    saveAttemptedRef.current = false;
    setEditing(false);
  };

  const saveEdit = () => {
    setSaveError(null);
    saveAttemptedRef.current = true;
    if (!draftName.trim()) {
      setSaveError("Name is required.");
      return;
    }
    if (!draftSurname.trim()) {
      setSaveError("Surname is required.");
      return;
    }
    onSaveNames(user.id, draftName.trim(), draftSurname.trim());
  };

  return (
    <div className="flex items-center gap-4 rounded-lg border bg-card p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Input
                value={draftName}
                placeholder="First name"
                aria-label="First name"
                onChange={(e) => setDraftName(e.target.value)}
              />
              <Input
                value={draftSurname}
                placeholder="Surname"
                aria-label="Surname"
                onChange={(e) => setDraftSurname(e.target.value)}
              />
            </div>
            {saveError && <p className="text-[13px] text-destructive">{saveError}</p>}
          </div>
        ) : (
          <>
            <p className="truncate text-sm font-medium">{displayName || "No name"}</p>
            <p className="truncate text-[13px] text-muted-foreground">{user.email}</p>
          </>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant={user.role === "admin" ? "default" : "secondary"}>
          <ShieldCheck size={10} className="mr-0.5" />
          {user.role}
        </Badge>
        <Badge variant={user.is_active ? "default" : "destructive"}>
          {user.is_active ? "Active" : "Inactive"}
        </Badge>
      </div>
      {editing ? (
        <div className="flex shrink-0 items-center gap-1">
          <Button size="icon" variant="ghost" onClick={saveEdit} disabled={isSavingNames} aria-label="Save name">
            {isSavingNames ? <span className="animate-spin text-sm">…</span> : <Check size={16} />}
          </Button>
          <Button size="icon" variant="ghost" onClick={cancelEdit} disabled={isSavingNames} aria-label="Cancel edit">
            <X size={16} />
          </Button>
        </div>
      ) : (
        <>
          <Button size="icon" variant="ghost" onClick={startEdit} disabled={isPending} aria-label={`Edit ${user.email}`}>
            <Pencil size={16} />
          </Button>
          <Button
            size="sm"
            variant={user.is_active ? "destructive" : "outline"}
            onClick={() => onToggle(user.id, !user.is_active)}
            disabled={isPending}
            aria-label={user.is_active ? `Deactivate ${user.email}` : `Activate ${user.email}`}
          >
            {user.is_active ? "Deactivate" : "Activate"}
          </Button>
        </>
      )}
    </div>
  );
}

export function UserManagementTab() {
  const queryClient = useQueryClient();

  const {
    data: users,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchUsers,
  });

  const queryKey = ["admin-users"] as const;

  const mutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, isActive }),
      });
      if (!res.ok) throw new Error("Failed to update user");
      return res.json();
    },
    onMutate: async ({ userId, isActive }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<User[]>(queryKey);
      queryClient.setQueryData<User[]>(queryKey, (old) =>
        old?.map((u) => (u.id === userId ? { ...u, is_active: isActive } : u)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const namesMutation = useMutation({
    mutationFn: async ({ userId, name, surname }: { userId: string; name: string; surname: string }) => {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, name, surname }),
      });
      if (!res.ok) throw new Error("Failed to update user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">User Management</h3>
        <p className="text-xs text-muted-foreground">
          Invite contributors and manage account access
        </p>
      </div>

      <InviteForm />

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
        <div className="flex items-center justify-between">
          {users && (
            <span className="text-[13px] text-muted-foreground">
              {users.length} user{users.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive">Failed to load users.</p>
        ) : users && users.length > 0 ? (
          <div className="flex flex-col gap-3">
            {users.map((u) => (
              <UserCard
                key={u.id}
                user={u}
                onToggle={(id, active) => mutation.mutate({ userId: id, isActive: active })}
                onSaveNames={(id, name, surname) => namesMutation.mutate({ userId: id, name, surname })}
                isPending={mutation.isPending}
                isSavingNames={namesMutation.isPending}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-soft p-8 text-center">
            <p className="text-sm text-muted-foreground">No users found.</p>
          </div>
        )}
      </div>
    </div>
  );
}