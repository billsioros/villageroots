import { describe, expect, it } from "vitest";
import { OCR_EXTRACTION_JSON_SCHEMA } from "@/lib/ocr/schema";
import { VERBS } from "@/lib/graph/helpers";

const schema = OCR_EXTRACTION_JSON_SCHEMA.schema;

describe("OCR_EXTRACTION_JSON_SCHEMA", () => {
  it("is a strict object schema requiring entities", () => {
    expect(schema.type).toBe("object");
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toContain("entities");
    expect(schema.required).toEqual(["entities", "relationships", "document_summary"]);
  });

  it("restricts entity types (no 'path')", () => {
    const items = schema.properties.entities.items;
    expect(items.properties.type.enum).toEqual([
      "person",
      "family",
      "toponym",
      "landmark",
      "event",
    ]);
    expect(items.required).toEqual(["name", "type", "subtitle", "description", "facts", "deceased"]);
  });

  it("restricts relationship verbs to the app verbs", () => {
    const verbEnum = schema.properties.relationships.items.properties.verb.enum;
    expect(verbEnum).toEqual(VERBS);
    expect(verbEnum).toContain("born_in");
    expect(verbEnum).not.toContain("invented_thing");
  });
});
