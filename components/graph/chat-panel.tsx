"use client";

import { useEffect, useRef } from "react";
import { Sparkles, Send } from "lucide-react";
import { useGraphStore } from "@/store/graphStore";
import { ModalShell } from "./modals";

export function ChatPanel() {
  const open = useGraphStore((s) => s.chatOpen);
  const toggleChat = useGraphStore((s) => s.toggleChat);
  const messages = useGraphStore((s) => s.chatMessages);
  const input = useGraphStore((s) => s.chatInput);
  const setChatInput = useGraphStore((s) => s.setChatInput);
  const sendChat = useGraphStore((s) => s.sendChat);
  const litPath = useGraphStore((s) => s.litPath);
  const setPanIntent = useGraphStore((s) => s.setPanIntent);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open]);

  if (!open) return null;

  return (
    <ModalShell title="GraphRAG" onClose={toggleChat} className="w-[720px] max-w-[95vw] max-h-[80vh] flex flex-col">
      <div className="flex gap-1.5 pb-2">
        {["The mill", "Kalyvia", "Agios Ioannis"].map((chip) => (
          <button
            key={chip}
            onClick={() => sendChat(chip)}
            className="rounded-full border bg-surface-warm px-3 py-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            {chip}
          </button>
        ))}
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto pr-1" style={{ maxHeight: "calc(80vh - 140px)" }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary mb-3">
              <Sparkles size={20} />
            </div>
            <p className="text-sm font-medium">Ask the village anything</p>
            <p className="mt-1 text-xs text-muted-foreground">People, places, stories, connections…</p>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`mb-2.5 max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
              m.role === "user"
                ? "ml-auto rounded-br-md bg-foreground text-background"
                : "rounded-bl-md border bg-surface-warm"
            }`}
          >
            {m.content}
            {m.role === "assistant" && m.path && (
              <button
                onClick={() => {
                  litPath(m.path!);
                  setPanIntent({ nodeId: m.path!.nodeIds[0] });
                }}
                className="mt-2 flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-[11px] font-medium text-background"
              >
                <Sparkles size={11} /> See on the map
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t pt-3">
        <input
          value={input}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendChat(input)}
          placeholder="Ask about people, places, stories…"
          className="flex-1 rounded-full border bg-surface-warm px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
        />
        <button
          onClick={() => sendChat(input)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-accent-hover"
          aria-label="Send"
        >
          <Send size={15} />
        </button>
      </div>
    </ModalShell>
  );
}
