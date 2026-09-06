"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LoaderCircle, LogOut, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useGraphStore } from "@/store/graphStore";
import { getInitials, getDisplayName } from "@/lib/utils/user-profile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AvatarMenu() {
  const router = useRouter();
  const setProfileOpen = useGraphStore((s) => s.setProfileOpen);
  const pushToast = useGraphStore((s) => s.pushToast);
  const [email, setEmail] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [initials, setInitials] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const loadUser = useCallback(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const userEmail = data.user?.email ?? "";
      const meta = data.user?.user_metadata ?? {};
      const name = typeof meta.name === "string" ? meta.name : "";
      const surname = typeof meta.surname === "string" ? meta.surname : "";
      setEmail(userEmail);
      setDisplayName(getDisplayName(name, surname));
      setInitials(getInitials(name, surname) || (userEmail ? userEmail.charAt(0).toUpperCase() : ""));
    });
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) loadUser();
  };

  const handleLogout = async () => {
    if (isSigningOut) return;
    setOpen(false);
    setIsSigningOut(true);
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        pushToast({ tone: "error", message: "We couldn't sign you out — please try again." });
        return;
      }
      router.push("/auth/login");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  };

  if (!initials) {
    return (
      <div className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-[11px] font-semibold text-secondary-foreground">
        …
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-[11px] font-semibold text-background transition-colors hover:opacity-90"
          aria-label="Account menu"
        >
          {initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">
          {displayName || email || "Account"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setProfileOpen(true)}>
          <User />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/auth/update-password")}>
          <KeyRound />
          Change Password
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={isSigningOut}
          onSelect={handleLogout}
        >
          {isSigningOut ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <LogOut />
          )}
          {isSigningOut ? "Signing out…" : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
