"use client";

import { Sparkles } from "lucide-react";
import { useGraphStore } from "@/store/graphStore";

export function ChatFab() {
  const open = useGraphStore((s) => s.chatOpen);
  const toggleChat = useGraphStore((s) => s.toggleChat);

  if (open) return null;

  return (
    <button
      onClick={toggleChat}
      className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-elev-raised transition-transform hover:scale-105 hover:bg-accent-hover"
      aria-label="Open chat"
    >
      <Sparkles size={20} />
    </button>
  );
}
