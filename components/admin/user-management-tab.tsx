"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { InviteForm } from "@/components/auth/invite-form";
import { getInitials, getDisplayName } from "@/lib/utils/user-profile";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { UserEditDialog, type ManagedUser, type UserPatch } from "@/components/admin/user-edit-dialog";

interface User extends ManagedUser {
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
    </div>
  );
}

function UserCard({
  user,
  onOpen,
}: {
  user: User;
  onOpen: (user: User) => void;
}) {
  const displayName = getDisplayName(user.name ?? "", user.surname ?? "");
  const initials =
    getInitials(user.name ?? "", user.surname ?? "") || user.email.slice(0, 2).toUpperCase();

  return (
    <button
      type="button"
      onClick={() => onOpen(user)}
      aria-label={`Edit ${user.email}`}
      className="flex w-full items-center gap-4 rounded-lg border bg-card p-4 text-left transition-colors hover:border-border-soft hover:bg-surface-warm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{displayName || "No name"}</p>
        <p className="truncate text-[13px] text-muted-foreground">{user.email}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant={user.role === "admin" ? "default" : "secondary"}>
          {user.role === "admin" && <ShieldCheck size={10} className="mr-0.5" />}
          {user.role === "admin" ? "Admin" : "Contributor"}
        </Badge>
        <Badge variant={user.is_active ? "default" : "destructive"}>
          {user.is_active ? "Active" : "Inactive"}
        </Badge>
      </div>
      <ChevronRightIcon />
    </button>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-muted-foreground"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function UserManagementTab() {
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [currentUid, setCurrentUid] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (active) setCurrentUid(data.user?.id ?? null);
      })
      .catch(() => {
        if (active) setCurrentUid(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const {
    data: users,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchUsers,
  });

  const queryKey = ["admin-users"] as const;

  const updateUser = useMutation({
    mutationFn: async ({ userId, ...patch }: { userId: string; email?: string } & UserPatch) => {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...patch }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Failed to update user");
      return body;
    },
    onMutate: async ({ userId, ...patch }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<User[]>(queryKey);
      queryClient.setQueryData<User[]>(queryKey, (old) =>
        old?.map((u) =>
          u.id === userId
            ? {
                ...u,
                ...(patch.name !== undefined ? { name: patch.name } : {}),
                ...(patch.surname !== undefined ? { surname: patch.surname } : {}),
                ...(patch.role !== undefined ? { role: patch.role } : {}),
                ...(patch.isActive !== undefined ? { is_active: patch.isActive } : {}),
              }
            : u,
        ),
      );
      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error(err instanceof Error ? err.message : "Failed to update user");
    },
    onSuccess: () => {
      setEditingUser(null);
    },
    onSettled: () => {
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
              <UserCard key={u.id} user={u} onOpen={setEditingUser} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-soft p-8 text-center">
            <p className="text-sm text-muted-foreground">No users found.</p>
          </div>
        )}
      </div>

      {editingUser && (
        <UserEditDialog
          user={editingUser}
          isSelf={editingUser.id === currentUid}
          isSaving={updateUser.isPending}
          onClose={() => setEditingUser(null)}
          onSave={(patch) =>
            updateUser.mutate({ userId: editingUser.id, ...patch, email: editingUser.email })
          }
        />
      )}
    </div>
  );
}
