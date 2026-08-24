import { VERB_KIND, VERBS, uid } from "@/lib/graph/helpers";
import type { DraftEdge, DraftNode } from "@/lib/graph/types";
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_FACT_LENGTH,
  MAX_FIELD_LENGTH,
  MAX_SUBMISSION_EDGES,
  MAX_SUBMISSION_NODES,
} from "@/lib/graph/submissions";
import { ENTITY_TYPES, type OcrExtraction } from "@/lib/ocr/schema";

const SYSTEM_PROMPT = `You transcribe structured data from scans of Greek village archival documents (birth, marriage, death, land, and census records), often handwritten.

Rules:
- Extract only what is actually visible in the document. Never invent entities.
- Keep person and place names exactly as written in the source, including Greek script when used.
- Classify every entity as exactly one of the allowed types: person, family, toponym, landmark, event.
- Extract relationships exhaustively. Whenever the document states or clearly implies a link between two entities, add a relationship whose source and target copy the entity names exactly as written in the entities array. Use only these verbs: related_to, born_in, child_of, married_to, sibling_of, belongs_to_clan, owns_land_at, lived_at, farmed_at, baptized_at, buried_at, ran_by, built_by, participated_in, gathered_at, attended, fought_in, migrated_from. Pick the closest match.
- Typical examples: spouses → married_to; siblings → sibling_of; a row listing parents → child_of from the child to each parent; a birthplace → born_in; residence → lived_at; land held or cultivated → owns_land_at or farmed_at; baptisms and burials at a church → baptized_at or buried_at toward that landmark; festivals and gatherings → attended or gathered_at; military service → fought_in or participated_in; a person who founded or ran an institution → built_by or ran_by from the institution to the person; unclear but evident association → related_to.
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

/** JSON.parse wrapper: returns undefined on failure (JSON.parse never yields undefined). */
function tryParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function stripFences(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced ? fenced[1].trim() : text;
}

/** Tries slices ending at each "}" from the right, so trailing prose braces can't hide valid JSON. */
function recoverJsonFromProse(text: string): unknown {
  const start = text.indexOf("{");
  if (start === -1) return undefined;
  for (let end = text.lastIndexOf("}"); end > start; end = text.lastIndexOf("}", end - 1)) {
    const value = tryParse(text.slice(start, end + 1));
    if (value !== undefined) return value;
  }
  return undefined;
}

/** Tolerant parser: free models sometimes wrap JSON in fences or prose despite strict mode. */
export function parseOcrResponse(raw: unknown): OcrExtraction | null {
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  let parsed: unknown = tryParse(text);
  if (parsed === undefined) {
    const stripped = stripFences(text);
    parsed = tryParse(stripped) ?? recoverJsonFromProse(stripped);
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const candidate = parsed as Partial<OcrExtraction>;
  if (!Array.isArray(candidate.entities)) return null;
  if ("relationships" in candidate && !Array.isArray(candidate.relationships))
    candidate.relationships = [];
  return candidate as OcrExtraction;
}

const ENTITY_TYPE_SET = new Set<string>(ENTITY_TYPES);

function clamp(value: string, max: number): string {
  return value.slice(0, max);
}

/**
 * Maps an extraction to the shapes ContributePanel already consumes.
 * Anything invalid, dangling, duplicated, or over the caps is silently
 * dropped — the user reviews everything in the modal anyway.
 */
export function toDrafts(extraction: OcrExtraction): { nodes: DraftNode[]; edges: DraftEdge[] } {
  const idsByName = new Map<string, string>();
  const nodes: DraftNode[] = [];

  for (const entity of extraction.entities) {
    if (nodes.length >= MAX_SUBMISSION_NODES) break;
    const name = typeof entity?.name === "string" ? entity.name.trim() : "";
    if (!name) continue;
    const key = name.toLowerCase();
    if (idsByName.has(key)) continue;
    const type =
      typeof entity.type === "string" && ENTITY_TYPE_SET.has(entity.type) ? entity.type : null;
    if (!type) continue;
    const draft: DraftNode = {
      id: `draft-${uid()}`,
      type: type as DraftNode["type"],
      label: clamp(name, MAX_FIELD_LENGTH),
      x: 0,
      y: 0,
      draft: true,
    };
    if (typeof entity.subtitle === "string" && entity.subtitle.trim())
      draft.subtitle = clamp(entity.subtitle.trim(), MAX_FIELD_LENGTH);
    if (typeof entity.description === "string" && entity.description.trim())
      draft.description = clamp(entity.description.trim(), MAX_DESCRIPTION_LENGTH);
    if (entity.deceased === true) draft.deceased = true;
    if (entity.facts && typeof entity.facts === "object" && !Array.isArray(entity.facts)) {
      const facts: Record<string, string> = {};
      for (const [factKey, factValue] of Object.entries(entity.facts)) {
        if (typeof factValue !== "string" || !factValue.trim()) continue;
        facts[factKey] = clamp(factValue.trim(), MAX_FACT_LENGTH);
      }
      if (Object.keys(facts).length > 0) draft.facts = facts;
    }
    idsByName.set(key, draft.id);
    nodes.push(draft);
  }

  const edges: DraftEdge[] = [];
  const seenEdges = new Set<string>();

  for (const relationship of extraction.relationships ?? []) {
    if (edges.length >= MAX_SUBMISSION_EDGES) break;
    const verb = typeof relationship?.verb === "string" ? relationship.verb : "";
    if (!(VERBS as string[]).includes(verb)) continue;
    const source =
      typeof relationship.source === "string"
        ? idsByName.get(relationship.source.toLowerCase())
        : undefined;
    const target =
      typeof relationship.target === "string"
        ? idsByName.get(relationship.target.toLowerCase())
        : undefined;
    if (!source || !target || source === target) continue;
    const dedupeKey = `${source}->${target}:${verb}`;
    if (seenEdges.has(dedupeKey)) continue;
    seenEdges.add(dedupeKey);
    edges.push({
      id: `draft-edge-${uid()}`,
      source,
      target,
      verb: verb as DraftEdge["verb"],
      kind: VERB_KIND[verb as keyof typeof VERB_KIND],
      draft: true,
    });
  }

  return { nodes, edges };
}
