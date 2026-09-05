"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LoaderCircle, LogOut, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useGraphStore } from "@/store/graphStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getInitials(email: string): string {
  return email.charAt(0).toUpperCase();
}

export function AvatarMenu() {
  const router = useRouter();
  const setProfileOpen = useGraphStore((s) => s.setProfileOpen);
  const pushToast = useGraphStore((s) => s.pushToast);
  const [email, setEmail] = useState<string>("");
  const [initials, setInitials] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const userEmail = data.user?.email ?? "";
      setEmail(userEmail);
      setInitials(getInitials(userEmail));
    });
  }, []);

  const handleLogout = async (event: Event) => {
    event.preventDefault();
    if (isSigningOut) return;
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-[11px] font-semibold text-background transition-colors hover:opacity-90"
          aria-label="Account menu"
        >
          {initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{email || "Account"}</DropdownMenuLabel>
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
