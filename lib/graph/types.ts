export type NodeType =
  | "person"
  | "family"
  | "landmark"
  | "toponym"
  | "event"
  | "path";

export type Status = "pending" | "approved" | "rejected";

export type Privacy = "public" | "private";

export type EdgeKind = "social" | "geo" | "hist";

export type Verb =
  | "related_to"
  | "born_in"
  | "child_of"
  | "married_to"
  | "sibling_of"
  | "belongs_to_clan"
  | "owns_land_at"
  | "lived_at"
  | "farmed_at"
  | "baptized_at"
  | "buried_at"
  | "ran_by"
  | "built_by"
  | "participated_in"
  | "gathered_at"
  | "attended"
  | "fought_in"
  | "migrated_from";

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  subtitle: string;
  description: string;
  color: string; // hex, derived from TYPE_META[type].color
  mark: string; // glyph, derived from TYPE_META[type].glyph
  x: number; // seed position (mockup coords)
  y: number;
  status?: Status;
  draft?: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  verb: Verb;
  kind: EdgeKind;
  suggested?: boolean;
  confidence?: number;
  draft?: boolean;
}

export interface SuggestedEdge extends GraphEdge {
  suggested: true;
  confidence: number;
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  path?: { nodeIds: string[]; edgeIds: string[] };
}

export type ToastTone = "info" | "error" | "success";

export interface Toast {
  tone: ToastTone;
  message: string;
}

export type ZoomIntent = "in" | "out" | "fit" | null;

export interface PanIntent {
  nodeId: string;
}

export interface DraftNode {
  id: string;
  type: NodeType;
  label: string;
  subtitle?: string;
  description?: string;
  facts?: Record<string, string>;
  deceased?: boolean;
  x: number;
  y: number;
  draft: true;
}

export interface DraftEdge {
  id: string;
  source: string;
  target: string;
  verb: Verb;
  kind: EdgeKind;
  draft: true;
}
