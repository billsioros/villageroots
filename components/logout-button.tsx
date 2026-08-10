"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={logout}
      aria-label="Log out"
      className="h-9 w-9 rounded-full text-muted-foreground"
    >
      <LogOut size={16} />
    </Button>
  );
}
