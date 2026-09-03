"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useGraphStore } from "@/store/graphStore";

function getInitials(email: string): string {
  return email.charAt(0).toUpperCase();
}

export function AvatarMenu() {
  const setProfileOpen = useGraphStore((s) => s.setProfileOpen);
  const [initials, setInitials] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email ?? "";
      setInitials(getInitials(email));
    });
  }, []);

  if (!initials) {
    return (
      <div className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-[11px] font-semibold text-secondary-foreground">
        …
      </div>
    );
  }

  return (
    <button
      onClick={() => setProfileOpen(true)}
      className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-[11px] font-semibold text-background transition-colors hover:opacity-90"
      aria-label="Open profile"
    >
      {initials}
    </button>
  );
}
