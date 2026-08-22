import { describe, expect, it } from "vitest";
import { buildOcrMessages, parseOcrResponse, toDrafts } from "@/lib/ocr/extract";
import { VERBS } from "@/lib/graph/helpers";
import { MAX_FACT_LENGTH, MAX_FIELD_LENGTH } from "@/lib/graph/submissions";

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

  it("normalizes malformed relationships to an empty array", () => {
    expect(parseOcrResponse('{"entities": [], "relationships": 5}')).toEqual({
      entities: [],
      relationships: [],
    });
  });

  it("parses content with backticks inside string values", () => {
    const tricky = JSON.stringify({ entities: [{ name: "o`clock", type: "landmark" }] });
    expect(parseOcrResponse(tricky)).toEqual({ entities: [{ name: "o`clock", type: "landmark" }] });
  });

  it("recovers JSON when trailing prose contains braces", () => {
    expect(parseOcrResponse(`Result:\n${good}\nNote: {see page 3}`)).toEqual({
      entities: [{ name: "Nikos", type: "person" }],
    });
  });

  it("returns null when no slice parses", () => {
    expect(parseOcrResponse("{a {b} c}")).toBeNull();
  });
});

const person = (overrides: Record<string, unknown> = {}) => ({
  name: "Nikos",
  type: "person",
  ...overrides,
});

describe("toDrafts", () => {
  it("assigns draft ids, kinds, and flags", () => {
    const { nodes, edges } = toDrafts({
      entities: [person({ deceased: true }), { name: "Kato Potamia", type: "toponym" }],
      relationships: [{ source: "nikos", target: "KATO POTAMIA", verb: "lived_at" }],
    });
    expect(nodes).toHaveLength(2);
    expect(nodes[0]).toMatchObject({ label: "Nikos", type: "person", deceased: true, draft: true });
    expect(nodes[0].id).toMatch(/^draft-/);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      source: nodes[0].id,
      target: nodes[1].id,
      verb: "lived_at",
      kind: "geo",
      draft: true,
    });
    expect(edges[0].id).toMatch(/^draft-edge-/);
  });

  it("clamps long strings to submission caps", () => {
    const { nodes } = toDrafts({
      entities: [person({ name: "x".repeat(500), facts: { note: "y".repeat(2000) } })],
    });
    expect(nodes[0].label).toHaveLength(MAX_FIELD_LENGTH);
    expect(nodes[0].facts?.note).toHaveLength(MAX_FACT_LENGTH);
  });

  it("drops unknown types, empty names, and duplicates (first wins)", () => {
    const { nodes } = toDrafts({
      entities: [
        person(),
        { name: "", type: "person" },
        { name: "Ghost", type: "path" },
        { name: "NIKOS", type: "family" },
      ],
    });
    expect(nodes).toHaveLength(1);
    expect(nodes[0].label).toBe("Nikos");
  });

  it("drops dangling, self-loop, unknown-verb, and duplicate relationships", () => {
    const { edges } = toDrafts({
      entities: [person(), { name: "Village", type: "toponym" }],
      relationships: [
        { source: "Nikos", target: "Nobody", verb: "lived_at" },
        { source: "Nikos", target: "Nikos", verb: "related_to" },
        { source: "Nikos", target: "Village", verb: "not_a_verb" },
        { source: "Nikos", target: "Village", verb: "lived_at" },
        { source: "Nikos", target: "Village", verb: "lived_at" },
      ],
    });
    expect(edges).toHaveLength(1);
  });

  it("caps output at 20 nodes and 50 edges", () => {
    const many = Array.from({ length: 30 }, (_, i) => person({ name: `P${i}` }));
    const rels = Array.from({ length: 90 }, (_, i) => ({
      source: `P${i % 20}`,
      target: `P${(i + 1) % 20}`,
      verb: VERBS[i % VERBS.length],
    }));
    const { nodes, edges } = toDrafts({ entities: many, relationships: rels });
    expect(nodes).toHaveLength(20);
    expect(edges).toHaveLength(50);
  });
});
