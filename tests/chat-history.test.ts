import { describe, expect, it } from "vitest";
import type { ChatMessage } from "@/lib/graph/types";
import { buildChatHistory, normalizeHistory, MAX_HISTORY_ANSWER_CHARS } from "@/lib/graph/chat-history";

const user = (i: number, content = `q${i}`): ChatMessage => ({ id: `u${i}`, role: "user", content });
const asst = (i: number, content = `a${i}`): ChatMessage => ({ id: `a${i}`, role: "assistant", content });

describe("buildChatHistory", () => {
  it("pairs each user message with the following assistant message", () => {
    const messages = [user(1, "Who was Yiannis?"), asst(1, "A poet."), user(2, "And Marika?"), asst(2, "His wife.")];
    expect(buildChatHistory(messages)).toEqual([
      { question: "Who was Yiannis?", answer: "A poet." },
      { question: "And Marika?", answer: "His wife." },
    ]);
  });

  it("returns [] for empty or single-sided messages", () => {
    expect(buildChatHistory([])).toEqual([]);
    expect(buildChatHistory([user(1)])).toEqual([]);
    expect(buildChatHistory([asst(1)])).toEqual([]);
  });

  it("skips in-flight (loading) assistant answers", () => {
    const loadingAssistant: ChatMessage = { id: "a2", role: "assistant", content: "", loading: true };
    const messages: ChatMessage[] = [user(1), asst(1, "done"), { ...user(2), content: "now?" }, loadingAssistant];
    expect(buildChatHistory(messages)).toEqual([{ question: "q1", answer: "done" }]);
  });

  it("caps to the last maxExchanges with oldest dropped first", () => {
    const messages = [user(1), asst(1), user(2), asst(2), user(3), asst(3), user(4), asst(4)];
    expect(buildChatHistory(messages, 3)).toEqual([
      { question: "q2", answer: "a2" },
      { question: "q3", answer: "a3" },
      { question: "q4", answer: "a4" },
    ]);
  });
});

describe("normalizeHistory", () => {
  it("passes through valid entries", () => {
    expect(normalizeHistory([{ question: "Q", answer: "A" }])).toEqual([{ question: "Q", answer: "A" }]);
  });

  it("drops malformed entries and caps at maxExchanges", () => {
    const raw = [null, { question: "", answer: "A" }, { question: "Q", answer: "A" }, { question: "Q2", answer: "A2" }, 42, "x"];
    expect(normalizeHistory(raw, 1)).toEqual([{ question: "Q2", answer: "A2" }]);
  });

  it("drops whitespace-only questions and trims the kept question", () => {
    expect(
      normalizeHistory([{ question: "   ", answer: "A" }, { question: "  hi  ", answer: "A" }]),
    ).toEqual([{ question: "hi", answer: "A" }]);
  });

  it("truncates long answers to MAX_HISTORY_ANSWER_CHARS", () => {
    const long = "x".repeat(MAX_HISTORY_ANSWER_CHARS + 50);
    const [first] = normalizeHistory([{ question: "Q", answer: long }]);
    expect(first.answer.length).toBe(MAX_HISTORY_ANSWER_CHARS);
  });
});
