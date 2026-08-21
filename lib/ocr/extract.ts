import type { OcrExtraction } from "@/lib/ocr/schema";

const SYSTEM_PROMPT = `You transcribe structured data from scans of handwritten Greek village archival documents (birth, marriage, death, land, and census records).

Rules:
- Extract only what is actually visible in the document. Never invent or guess entities or relationships.
- Keep person and place names exactly as written in the source, including Greek script when used.
- Classify every entity as exactly one of the allowed types: person, family, toponym, landmark, event.
- Express relationships using only the provided verb enumeration; pick the closest match.
- Put dates, occupations, and other attributes into an entity's facts with short English keys (born, died, married, occupation).
- Set deceased=true for people the document indicates are dead.
- If the document is unreadable, return an empty entities array.
Respond with JSON only.`;

export function buildOcrMessages(dataUri: string) {
  return [
    { role: "system" as const, content: SYSTEM_PROMPT },
    {
      role: "user" as const,
      content: [
        { type: "text" as const, text: "Extract entities and relationships from this document scan." },
        { type: "image_url" as const, image_url: { url: dataUri } },
      ],
    },
  ];
}

/** Tolerant parser: free models sometimes wrap JSON in fences or prose despite strict mode. */
export function parseOcrResponse(raw: unknown): OcrExtraction | null {
  if (typeof raw !== "string") return null;
  let text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const candidate = parsed as Partial<OcrExtraction>;
  if (!Array.isArray(candidate.entities)) return null;
  return candidate as OcrExtraction;
}
