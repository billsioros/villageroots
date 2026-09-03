"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InviteForm } from "@/components/auth/invite-form";
import { ShieldCheck } from "lucide-react";

interface User {
  id: string;
  email: string;
  full_name: string | null;
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
  isPending,
}: {
  user: User;
  onToggle: (userId: string, isActive: boolean) => void;
  isPending: boolean;
}) {
  const initials = (user.full_name ?? user.email).slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-4 rounded-lg border bg-card p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {user.full_name ?? "No name"}
        </p>
        <p className="truncate text-[13px] text-muted-foreground">
          {user.email}
        </p>
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
      <Button
        size="sm"
        variant={user.is_active ? "destructive" : "outline"}
        onClick={() => onToggle(user.id, !user.is_active)}
        disabled={isPending}
        aria-label={user.is_active ? `Deactivate ${user.email}` : `Activate ${user.email}`}
      >
        {user.is_active ? "Deactivate" : "Activate"}
      </Button>
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  return (
    <div className="flex flex-col gap-5">
      <InviteForm />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-muted-foreground">
            Registered Users
          </h4>
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
                isPending={mutation.isPending}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No users found.</p>
        )}
      </div>
    </div>
  );
}