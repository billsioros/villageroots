import { TYPE_META } from "./helpers";
import type { GraphNode, DraftNode } from "./types";

export type Selected =
  | { node: GraphNode; isDraft: false }
  | { node: GraphNode; isDraft: true; draft: DraftNode };

export function resolveSelection(
  selectedId: string | null,
  nodesMap: Record<string, GraphNode>,
  draftNodes: DraftNode[]
): Selected | null {
  if (!selectedId) return null;
  const existing = nodesMap[selectedId] ?? null;
  if (existing) return { node: existing, isDraft: false };
  const draft = draftNodes.find((x) => x.id === selectedId) ?? null;
  if (!draft) return null;
  return {
    node: {
      ...draft,
      color: TYPE_META[draft.type].color,
      mark: TYPE_META[draft.type].glyph,
      subtitle: draft.subtitle ?? "",
      description: draft.description ?? "",
    },
    isDraft: true,
    draft,
  };
}
