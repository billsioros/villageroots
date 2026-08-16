import { type NodeType, type Privacy, type Status } from "@/lib/graph/types";

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function derivePrivacyFor(type: NodeType, deceased: boolean): Privacy {
  return type === "person" && !deceased ? "private" : "public";
}

export interface CreateNodeInput {
  type: NodeType;
  label: string;
  subtitle?: string | null;
  description?: string | null;
  facts?: Record<string, string> | null;
  deceased?: boolean | null;
  x?: number | null;
  y?: number | null;
}

export interface NodeInsertValues {
  slug: string;
  type: NodeType;
  label: string;
  subtitle: string | null;
  description: string | null;
  properties: Record<string, unknown>;
  status: Status;
  privacy: Privacy;
  createdBy: string;
}

export function createNodeValues(
  input: CreateNodeInput,
  uid: string,
  status: Status,
  index: number,
): NodeInsertValues {
  const slug = `${slugify(input.label)}-${Date.now().toString(36)}-${index}`;
  const properties: Record<string, unknown> = {};
  if (input.facts) properties.facts = input.facts;
  if (input.type === "person") properties.deceased = Boolean(input.deceased);
  if (typeof input.x === "number") properties.x = input.x;
  if (typeof input.y === "number") properties.y = input.y;
  return {
    slug,
    type: input.type,
    label: input.label.trim(),
    subtitle: input.subtitle?.trim() || null,
    description: input.description?.trim() || null,
    properties,
    status,
    privacy: derivePrivacyFor(input.type, Boolean(input.deceased)),
    createdBy: uid,
  };
}
