"use client";

import { useEffect, useRef } from "react";
import { Loader2, Send } from "lucide-react";
import { useGraphStore } from "@/store/graphStore";
import { renderAnswerWithCitations, CitationPill, CitationGraphButton } from "./citation";
import { ModalShell } from "./modals";

export function ChatPanel() {
  const open = useGraphStore((s) => s.chatOpen);
  const toggleChat = useGraphStore((s) => s.toggleChat);
  const messages = useGraphStore((s) => s.chatMessages);
  const input = useGraphStore((s) => s.chatInput);
  const setChatInput = useGraphStore((s) => s.setChatInput);
  const sendChat = useGraphStore((s) => s.sendChat);
  const litPath = useGraphStore((s) => s.litPath);
  const flashNodes = useGraphStore((s) => s.flashNodes);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open]);

  if (!open) return null;

  return (
    <ModalShell title="Chat" onClose={toggleChat} className="w-[1000px] max-w-[95vw]">
      <div className="flex h-[600px] flex-col">
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto pr-1">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-lg font-medium">Ask the village anything</p>
              <p className="mt-1 text-sm text-muted-foreground">People, places, stories, connections…</p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`mb-3 max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto rounded-br-md bg-foreground text-background"
                    : "rounded-bl-md border bg-surface-warm"
                }`}
              >
                {m.role === "user" ? (
                  m.content
                ) : (
                  <div>
                    <div className="whitespace-pre-wrap">
                      {renderAnswerWithCitations(m.content, m.citations ?? []).map((seg, i) =>
                        seg.type === "citation" && "label" in seg ? (
                          <CitationPill key={i} label={seg.label} lowRelevance={seg.lowRelevance} />
                        ) : (
                          <span key={i}>{seg.value}</span>
                        ),
                      )}
                    </div>
                    <CitationGraphButton
                      hasCitations={(m.citations?.length ?? 0) > 0}
                      onClick={() => {
                        const path = m.path ?? { nodeIds: (m.citations ?? []).map((c) => c.nodeId), edgeIds: [] };
                        if (path.nodeIds.length > 0) {
                          litPath(path);
                        } else if (m.citations?.length) {
                          flashNodes(m.citations.map((c) => c.nodeId));
                        }
                      }}
                    />
                    {m.loading && (
                      <span className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Loader2 size={14} className="animate-spin" /> Searching the graph…
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
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
      </div>
    </ModalShell>
  );
}