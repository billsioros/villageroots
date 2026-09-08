"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Trash2 } from "lucide-react";
import { useGraphStore } from "@/store/graphStore";
import type { ChatMessage } from "@/lib/graph/types";
import { MarkdownAnswer } from "./markdown-answer";
import { CitationGraphButton } from "./citation";

export function ChatBar() {
  const messages = useGraphStore((s) => s.chatMessages);
  const chatInput = useGraphStore((s) => s.chatInput);
  const setChatInput = useGraphStore((s) => s.setChatInput);
  const sendChat = useGraphStore((s) => s.sendChat);
  const clearChat = useGraphStore((s) => s.clearChat);
  const litPath = useGraphStore((s) => s.litPath);
  const flashNodes = useGraphStore((s) => s.flashNodes);
  const focusSubgraph = useGraphStore((s) => s.focusSubgraph);

  const latest = messages[messages.length - 1];
  const previous = messages[messages.length - 2];
  const question = previous?.role === "user" ? previous.content : "";
  const expanded = Boolean(latest);

  const heldRef = useRef<{ latest: ChatMessage; question: string }>(undefined);
  if (expanded) heldRef.current = { latest, question };
  const display = expanded ? { latest, question } : heldRef.current;

  const [boxOpen, setBoxOpen] = useState(false);
  const [textVisible, setTextVisible] = useState(false);
  useEffect(() => {
    if (expanded) {
      setBoxOpen(true);
      const t = setTimeout(() => setTextVisible(true), 300);
      return () => clearTimeout(t);
    }
    setTextVisible(false);
    const t = setTimeout(() => setBoxOpen(false), 250);
    return () => clearTimeout(t);
  }, [expanded]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
      <div
        className={`pointer-events-auto grid transition-[grid-template-rows,border-radius] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          boxOpen
            ? "w-[42rem] max-w-[92vw] max-h-[60vh] grid-rows-[1fr] rounded-2xl border bg-card/90 p-3 shadow-elev-raised backdrop-blur"
            : "grid-rows-[0fr] w-[42rem] max-w-[92vw] rounded-[1.8rem] border bg-card/90 px-3 py-2 shadow-elev-raised backdrop-blur"
        }`}
      >
        <div className="min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {display && (
            <div
              className={`mb-3 flex flex-col items-start gap-2 transition-opacity duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] ${
                textVisible ? "opacity-100" : "opacity-0"
              }`}
            >
              {display.question && (
                <p className="text-sm font-medium text-muted-foreground">{display.question}</p>
              )}
              {display.latest.loading ? (
                <div className="flex h-6 items-center gap-1.5" aria-label="Searching the graph">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-foreground/40 animate-[wave_0.9s_ease-in-out_infinite]"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              ) : (
                <>
                  <MarkdownAnswer
                    content={display.latest.content}
                    citations={display.latest.citations ?? []}
                  />
                  <CitationGraphButton
                    hasCitations={(display.latest.citations?.length ?? 0) > 0}
                    onClick={() => {
                      const path = display.latest.path ?? {
                        nodeIds: (display.latest.citations ?? []).map((c) => c.nodeId),
                        edgeIds: [],
                      };
                      if (path.nodeIds.length > 0) {
                        litPath(path);
                        focusSubgraph(path.nodeIds);
                      } else if (display.latest.citations?.length) {
                        flashNodes(display.latest.citations.map((c) => c.nodeId));
                      }
                    }}
                  />
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={clearChat}
            title="Clear conversation"
            aria-label="Clear conversation"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface-warm hover:text-foreground"
          >
            <Trash2 size={15} />
          </button>
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && chatInput.trim()) submit();
            }}
            placeholder="Ask about people, places, stories…"
            className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            disabled={!chatInput.trim()}
            onClick={() => submit()}
            aria-label="Send"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
          >
            <ArrowUp size={15} />
          </button>
        </div>
      </div>
    </div>
  );

  function submit() {
    const text = chatInput.trim();
    if (!text) return;
    sendChat(text);
    setChatInput("");
  }
}