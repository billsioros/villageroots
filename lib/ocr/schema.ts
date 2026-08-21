import { VERBS } from "@/lib/graph/helpers";

export interface OcrEntity {
  name: string;
  type: string;
  subtitle?: string;
  description?: string;
  facts?: Record<string, string>;
  deceased?: boolean;
}

export interface OcrRelationship {
  source: string;
  target: string;
  verb: string;
}

export interface OcrExtraction {
  entities: OcrEntity[];
  relationships?: OcrRelationship[];
  document_summary?: string;
}

/**
 * Structured-output schema sent to OpenRouter. Optional fields are nullable
 * and listed in `required` because strict JSON schemas demand it; the
 * tolerant parser downstream does not rely on strictness anyway.
 */
export const OCR_EXTRACTION_JSON_SCHEMA = {
  name: "document_extraction",
  strict: true,
  schema: {
    type: "object",
    properties: {
      document_summary: { type: ["string", "null"] },
      entities: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Name exactly as written in the document" },
            type: {
              type: "string",
              enum: ["person", "family", "toponym", "landmark", "event"],
            },
            subtitle: { type: ["string", "null"] },
            description: { type: ["string", "null"] },
            facts: {
              type: ["object", "null"],
              additionalProperties: { type: "string" },
            },
            deceased: { type: ["boolean", "null"] },
          },
          required: ["name", "type", "subtitle", "description", "facts", "deceased"],
          additionalProperties: false,
        },
      },
      relationships: {
        type: "array",
        items: {
          type: "object",
          properties: {
            source: { type: "string", description: "Name of the source entity" },
            target: { type: "string", description: "Name of the target entity" },
            verb: { type: "string", enum: [...VERBS] },
          },
          required: ["source", "target", "verb"],
          additionalProperties: false,
        },
      },
    },
    required: ["entities", "relationships", "document_summary"],
    additionalProperties: false,
  },
} as const;
