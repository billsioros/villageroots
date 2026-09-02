"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut } from "lucide-react";

interface UserInfo {
  name: string;
  email: string;
  initials: string;
}

function getInitials(email: string): string {
  return email.charAt(0).toUpperCase();
}

export function AvatarMenu() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      const name =
        (u.user_metadata?.full_name as string) ||
        (u.user_metadata?.name as string) ||
        "";
      const email = u.email ?? "";
      setUser({ name, email, initials: getInitials(email) });
    });
  }, []);

  const logout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }, [router]);

  if (!user) {
    return (
      <div className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-[11px] font-semibold text-secondary-foreground">
        …
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-[11px] font-semibold text-background transition-colors hover:opacity-90"
          aria-label="Account menu"
        >
          {user.initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-0.5">
            {user.name && (
              <span className="text-sm font-semibold leading-none">
                {user.name}
              </span>
            )}
            <span className="text-xs leading-none text-muted-foreground">
              {user.email}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/auth/update-password")}>
          <User className="mr-2 h-4 w-4" />
          Change password
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
