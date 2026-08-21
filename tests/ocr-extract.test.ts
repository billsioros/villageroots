import { describe, expect, it } from "vitest";
import { buildOcrMessages, parseOcrResponse } from "@/lib/ocr/extract";

describe("buildOcrMessages", () => {
  it("returns a system prompt plus one image_url message", () => {
    const messages = buildOcrMessages("data:image/jpeg;base64,QUJD");
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ role: "system" });
    expect(messages[0].content).toMatch(/Greek/i);
    expect(messages[1]).toMatchObject({
      role: "user",
      content: [{ type: "text" }, { type: "image_url", image_url: { url: "data:image/jpeg;base64,QUJD" } }],
    });
  });
});

describe("parseOcrResponse", () => {
  const good = JSON.stringify({ entities: [{ name: "Nikos", type: "person" }] });

  it("parses plain JSON content", () => {
    expect(parseOcrResponse(good)).toEqual({ entities: [{ name: "Nikos", type: "person" }] });
  });

  it("strips markdown fences", () => {
    expect(parseOcrResponse("```json\n" + good + "\n```")).toEqual({
      entities: [{ name: "Nikos", type: "person" }],
    });
  });

  it("recovers JSON embedded in prose", () => {
    expect(parseOcrResponse(`Here you go:\n${good}\nDone.`)).toEqual({
      entities: [{ name: "Nikos", type: "person" }],
    });
  });

  it("returns null for garbage, non-strings, or missing entities", () => {
    expect(parseOcrResponse("not json")).toBeNull();
    expect(parseOcrResponse(42)).toBeNull();
    expect(parseOcrResponse('{"foo": 1}')).toBeNull();
    expect(parseOcrResponse("{broken")).toBeNull();
  });
});
