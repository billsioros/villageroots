import type { ChatHistoryItem, ChatMessage } from "@/lib/graph/types";

export const MAX_HISTORY_ANSWER_CHARS = 800;
export { type ChatHistoryItem };

export function buildChatHistory(messages: ChatMessage[], maxExchanges = 3): ChatHistoryItem[] {
  const pairs: ChatHistoryItem[] = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.role !== "user") continue;
    const next = messages[i + 1];
    if (next?.role === "assistant" && !next.loading) {
      pairs.push({ question: m.content, answer: next.content });
    }
  }
  return pairs.slice(-maxExchanges);
}

export function normalizeHistory(
  raw: unknown,
  maxExchanges = 3,
  maxAnswerChars = MAX_HISTORY_ANSWER_CHARS,
): ChatHistoryItem[] {
  if (!Array.isArray(raw)) return [];
  const out: ChatHistoryItem[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const { question, answer } = item as { question?: unknown; answer?: unknown };
    if (typeof question !== "string") continue;
    const trimmed = question.trim();
    if (trimmed.length === 0) continue;
    if (typeof answer !== "string") continue;
    out.push({
      question: trimmed,
      answer: answer.length > maxAnswerChars ? answer.slice(0, maxAnswerChars) : answer,
    });
  }
  return out.slice(-maxExchanges);
}
