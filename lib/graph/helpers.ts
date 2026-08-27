import type { GraphNode, NodeType, EdgeKind, Verb } from "./types";

export const TYPE_META: Record<
  NodeType,
  { label: string; color: string; glyph: string; pill: "family" | "standard" }
> = {
  person: { label: "Person", color: "#e15a72", glyph: "P", pill: "standard" },
  family: { label: "Family", color: "#e15a72", glyph: "F", pill: "family" },
  landmark: { label: "Landmark", color: "#2f9e62", glyph: "L", pill: "standard" },
  toponym: { label: "Toponym", color: "#3b82c4", glyph: "T", pill: "standard" },
  event: { label: "Event", color: "#d98e32", glyph: "E", pill: "standard" },
  path: { label: "Path", color: "#7a6bc4", glyph: "→", pill: "standard" },
};

export const VERB_KIND: Record<Verb, EdgeKind> = {
  related_to: "social",
  born_in: "geo",
  child_of: "social",
  married_to: "social",
  sibling_of: "social",
  parent_of: "social",
  belongs_to_clan: "social",
  owns_land_at: "geo",
  lived_at: "geo",
  farmed_at: "geo",
  baptized_at: "hist",
  buried_at: "hist",
  ran_by: "hist",
  built_by: "hist",
  participated_in: "hist",
  gathered_at: "hist",
  attended: "hist",
  fought_in: "hist",
  migrated_from: "hist",
};

export const VERBS: Verb[] = Object.keys(VERB_KIND) as Verb[];

export function hslToRgb(h: number, s: number, l: number, a = 1): string {
  const c = (1 - Math.abs(2 * l - 1)) * (s / 100);
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l / 100 - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return `rgba(${Math.round((r + m) * 255)}, ${Math.round((g + m) * 255)}, ${Math.round((b + m) * 255)}, ${a})`;
}

const TOKEN_FALLBACK: Record<string, string> = {
  primary: "351 100% 61%",
  border: "0 0% 87%",
  fg: "0 0% 13%",
  meta: "0 0% 57%",
  "surface-warm": "0 0% 97%",
  warn: "35 100% 38%",
  success: "123 100% 26%",
};

function parseHsl(v: string): [number, number, number] {
  const [h, sRaw, lRaw] = v.trim().split(/\s+/);
  return [parseFloat(h), parseFloat(sRaw), parseFloat(lRaw)];
}

// tokenColor("primary") → rgba from the live --primary CSS var (or fallback on SSR).
// tokenColor("warn", 0.4) → same hue at 40% alpha.
export function tokenColor(varName: string, alpha = 1): string {
  const fallback = TOKEN_FALLBACK[varName] ?? "0 0% 13%";
  if (typeof window === "undefined") return hslToRgb(...parseHsl(fallback), alpha);
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(`--${varName}`)
    .trim();
  return hslToRgb(...parseHsl(raw || fallback), alpha);
}

export function findNode(nodes: GraphNode[], nameOrId: string): GraphNode | undefined {
  const q = nameOrId.trim().toLowerCase();
  return nodes.find(
    (n) => n.id === q || n.label.toLowerCase() === q || n.label.toLowerCase().startsWith(q),
  );
}

export function countByType(nodes: GraphNode[]): Record<NodeType, number> {
  const counts: Record<NodeType, number> = {
    person: 0,
    family: 0,
    landmark: 0,
    toponym: 0,
    event: 0,
    path: 0,
  };
  for (const n of nodes) counts[n.type] += 1;
  return counts;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}
