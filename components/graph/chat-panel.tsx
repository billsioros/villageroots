"use client";

import { useEffect, useRef } from "react";
import { Sparkles, Send, X } from "lucide-react";
import { useGraphStore } from "@/store/graphStore";

export function ChatPanel() {
  const open = useGraphStore((s) => s.chatOpen);
  const collapsed = useGraphStore((s) => s.chatCollapsed);
  const sidepanelOpen = useGraphStore((s) => s.sidepanelOpen);
  const toggleChat = useGraphStore((s) => s.toggleChat);
  const toggleCollapsed = useGraphStore((s) => s.toggleCollapsed);
  const messages = useGraphStore((s) => s.chatMessages);
  const input = useGraphStore((s) => s.chatInput);
  const setChatInput = useGraphStore((s) => s.setChatInput);
  const sendChat = useGraphStore((s) => s.sendChat);
  const litPath = useGraphStore((s) => s.litPath);
  const setPanIntent = useGraphStore((s) => s.setPanIntent);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open, collapsed]);

  if (!open) return null;

  return (
    <div
      className={`fixed bottom-5 right-5 z-40 flex flex-col rounded-2xl border bg-card shadow-elev-raised transition-all duration-300 ${
        collapsed ? "h-[60px] w-[372px]" : "h-[min(560px,calc(100vh-190px))] w-[372px]"
      } ${sidepanelOpen ? "translate-x-[calc(-400px-16px)]" : ""}`}
    >
      <div className="flex h-[60px] shrink-0 cursor-pointer items-center gap-2.5 px-4" onClick={toggleCollapsed}>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary">
          <Sparkles size={15} />
        </span>
        <div>
          <div className="text-[13px] font-semibold leading-tight">GraphRAG</div>
          <div className="text-[11px] text-muted-foreground">Ask the village anything</div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleChat();
          }}
          className="ml-auto grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-surface-warm"
          aria-label="Close chat"
        >
          <X size={14} />
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="flex gap-1.5 px-4 pb-2">
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
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`mb-2.5 max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
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
          <div className="flex items-center gap-2 border-t p-3">
            <input
              value={input}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat(input)}
              placeholder="Ask about people, places, stories…"
              className="flex-1 rounded-full border bg-surface-warm px-4 py-2.5 text-[13px] outline-none placeholder:text-muted-foreground focus:border-primary"
            />
            <button
              onClick={() => sendChat(input)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-accent-hover"
              aria-label="Send"
            >
              <Send size={15} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
