export type NodeType =
  | "person"
  | "family"
  | "landmark"
  | "toponym"
  | "event"
  | "path";

export type Status = "pending" | "approved" | "rejected";

export type Privacy = "public" | "private";

export type RichTextJSON = Record<string, unknown>;

export type EdgeKind = "social" | "geo" | "hist";

export type Verb =
  | "related_to"
  | "born_in"
  | "child_of"
  | "married_to"
  | "sibling_of"
  | "parent_of"
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
  documentContent?: RichTextJSON;
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
  status?: Status;
}

export interface SuggestedEdge extends GraphEdge {
  suggested: true;
  confidence: number;
}

export type CitationOrigin = "retrieved" | "neighbor";

export interface Citation {
  label: string;
  nodeId: string;
  nodeType: string | null;
  slug: string;
  similarity: number;
  origin: CitationOrigin;
}

export interface Subgraph {
  nodeIds: string[];
  edgeIds: string[];
  citedNodeIds: string[];
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  path?: { nodeIds: string[]; edgeIds: string[] };
  citations?: Citation[];
  loading?: boolean;
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
  documentContent?: RichTextJSON;
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
