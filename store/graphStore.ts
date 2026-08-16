import { create } from "zustand";
import { SUGGESTED_EDGES, REVIEW_SEED } from "@/lib/graph/data";
import { uid, countByType as countByTypeHelper, TYPE_META } from "@/lib/graph/helpers";
import { toNodeRow, toEdgeRow } from "@/lib/graph/mappers";
import { queryClient } from "@/lib/graph/query-client";
import { invalidationKeys } from "@/lib/graph/queries";
import type { NodeRow, EdgeRow } from "@/drizzle/schema";
import type {
  GraphNode,
  GraphEdge,
  SuggestedEdge,
  NodeType,
  EdgeKind,
  ReviewItem,
  ChatMessage,
  Toast,
  ZoomIntent,
  PanIntent,
  DraftNode,
  DraftEdge,
} from "@/lib/graph/types";

let toastTimer: ReturnType<typeof setTimeout> | null = null;
let flashTimer: ReturnType<typeof setTimeout> | null = null;
let litTimer: ReturnType<typeof setTimeout> | null = null;

const draftGraphCache = new WeakMap<
  DraftNode[],
  { hidden: Record<NodeType, boolean>; nodes: GraphNode[] }
>();

export interface GraphStore {
  // graph
  nodesMap: Record<string, GraphNode>;
  edges: GraphEdge[];
  suggestedEdges: SuggestedEdge[];
  draftNodes: DraftNode[];
  draftEdges: DraftEdge[];
  hydrateGraph: (nodes: GraphNode[], edges: GraphEdge[]) => void;
  addNode: (n: GraphNode) => void;
  updateNode: (id: string, patch: Partial<GraphNode>) => void;
  removeNode: (id: string) => void;
  addEdge: (e: GraphEdge) => void;
  updateEdge: (id: string, patch: Partial<GraphEdge>) => void;
  removeEdge: (id: string) => void;
  setNodePosition: (id: string, x: number, y: number) => void;
  pinNode: (id: string, pos: { x: number; y: number }) => void;

  // ui
  selectedId: string | null;
  sidepanelOpen: boolean;
  chatOpen: boolean;
  chatCollapsed: boolean;
  searchOpen: boolean;
  layersOpen: boolean;
  newNodeOpen: boolean;
  ocrOpen: boolean;
  aboutOpen: boolean;
  reviewOpen: boolean;
  toast: Toast | null;
  zoomPct: number;
  zoomIntent: ZoomIntent;
  panIntent: PanIntent | null;
  canvasCenter: { x: number; y: number };
  welcome: boolean;
  hint: boolean;
  selectNode: (id: string | null) => void;
  clearSelection: () => void;
  addDraftNode: (draft: DraftNode) => void;
  updateDraftNode: (id: string, patch: Partial<DraftNode>) => void;
  removeDraftNode: (id: string) => void;
  addDraftEdge: (draft: DraftEdge) => void;
  removeDraftEdge: (id: string) => void;
  clearDrafts: () => void;
  selectDraft: (id: string | null) => void;
  toggleChat: () => void;
  toggleCollapsed: () => void;
  setSearchOpen: (open: boolean) => void;
  setLayersOpen: (open: boolean) => void;
  setNewNodeOpen: (open: boolean) => void;
  setOcrOpen: (open: boolean) => void;
  setAboutOpen: (open: boolean) => void;
  setReviewOpen: (open: boolean) => void;
  dismissWelcome: () => void;
  dismissHint: () => void;
  pushToast: (t: Toast) => void;
  clearToast: () => void;
  setZoomPct: (pct: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setZoomIntent: (z: ZoomIntent) => void;
  setPanIntent: (p: PanIntent | null) => void;
  setCanvasCenter: (c: { x: number; y: number }) => void;

  // visibility
  hiddenTypes: Record<NodeType, boolean>;
  kindOn: Record<EdgeKind, boolean>;
  suggestOn: boolean;
  toggleType: (t: NodeType) => void;
  toggleKind: (k: EdgeKind) => void;
  toggleSuggest: () => void;

  // review
  reviewQueue: ReviewItem[];
  pushReview: (item: Omit<ReviewItem, "id">) => void;
  resolveReview: (id: string) => void;

  // chat
  chatInput: string;
  chatMessages: ChatMessage[];
  setChatInput: (text: string) => void;
  sendChat: (text: string) => void;

  // flash / lit
  flashIds: string[];
  litIds: string[];
  litEdgeIds: string[];
  flashNodes: (ids: string[]) => void;
  litPath: (path: { nodeIds: string[]; edgeIds: string[] }) => void;
  clearLit: () => void;

  // derived
  countByType: () => Record<NodeType, number>;
}

const MILL_PATH = {
  nodeIds: ["l-mill", "p-nikolas", "p-yiannis"],
  edgeIds: ["e-mill-nikolas", "e-nik-yiannis"],
};

function cannedAnswer(text: string): {
  answer: string;
  path?: { nodeIds: string[]; edgeIds: string[] };
} {
  const q = text.toLowerCase();
  if (q.includes("mill") || q.includes("kalyvia")) {
    return {
      answer:
        "The mill was built in 1920 and ground wheat for Kalyvia until 1965. Nikolas Katsaris ran it — ask him about the flood of '52.",
      path: MILL_PATH,
    };
  }
  if (q.includes("church") || q.includes("ioannis")) {
    return {
      answer:
        "Agios Ioannis is the village church, built in 1890. Most Potidaneians were baptized here, including Nikolas Katsaris.",
    };
  }
  return {
    answer:
      "I don't know the answer yet — the knowledge graph is still growing. Try asking about the mill, Kalyvia, or Agios Ioannis.",
  };
}

export const useGraphStore = create<GraphStore>()((set, get) => ({
  // graph
  nodesMap: {},
  edges: [],
  suggestedEdges: SUGGESTED_EDGES,
  draftNodes: [],
  draftEdges: [],
  hydrateGraph: (nodes, edges) =>
    set((s) => {
      const merged: Record<string, GraphNode> = { ...s.nodesMap };
      for (const n of nodes) {
        const prev = s.nodesMap[n.id];
        merged[n.id] = prev ? { ...n, x: prev.x ?? n.x, y: prev.y ?? n.y } : n;
      }
      return { nodesMap: merged, edges };
    }),
  addNode: (n) => {
    set((s) => ({ nodesMap: { ...s.nodesMap, [n.id]: n } }));
    const cache = queryClient.getQueryData<NodeRow[]>(invalidationKeys.nodes);
    if (cache) queryClient.setQueryData(invalidationKeys.nodes, [...cache, toNodeRow(n)]);
  },
  updateNode: (id, patch) => {
    set((s) => {
      const prev = s.nodesMap[id];
      if (!prev) return s;
      return { nodesMap: { ...s.nodesMap, [id]: { ...prev, ...patch } } };
    });
    const cache = queryClient.getQueryData<NodeRow[]>(invalidationKeys.nodes);
    if (!cache) return;
    queryClient.setQueryData(
      invalidationKeys.nodes,
      cache.map((r) => {
        if (r.slug !== id) return r;
        const rowPatch: Partial<NodeRow> = {};
        if (patch.type !== undefined) rowPatch.type = patch.type;
        if (patch.label !== undefined) rowPatch.label = patch.label;
        if (patch.subtitle !== undefined) rowPatch.subtitle = patch.subtitle;
        if (patch.description !== undefined) rowPatch.description = patch.description;
        const properties =
          patch.x === undefined && patch.y === undefined
            ? r.properties
            : {
                ...r.properties,
                ...(patch.x !== undefined ? { x: patch.x } : {}),
                ...(patch.y !== undefined ? { y: patch.y } : {}),
              };
        return { ...r, ...rowPatch, properties };
      }),
    );
  },
  removeNode: (id) => {
    set((s) => {
      const nodesMap = { ...s.nodesMap };
      delete nodesMap[id];
      const edges = s.edges.filter((e) => e.source !== id && e.target !== id);
      return { nodesMap, edges };
    });
    const cache = queryClient.getQueryData<NodeRow[]>(invalidationKeys.nodes);
    if (cache) queryClient.setQueryData(invalidationKeys.nodes, cache.filter((r) => r.slug !== id));
    const edgeCache = queryClient.getQueryData<EdgeRow[]>(invalidationKeys.edges);
    if (edgeCache) {
      queryClient.setQueryData(
        invalidationKeys.edges,
        edgeCache.filter((r) => r.sourceSlug !== id && r.targetSlug !== id),
      );
    }
  },
  addEdge: (e) => {
    set((s) => ({ edges: [...s.edges, e] }));
    const cache = queryClient.getQueryData<EdgeRow[]>(invalidationKeys.edges);
    if (cache) queryClient.setQueryData(invalidationKeys.edges, [...cache, toEdgeRow(e)]);
  },
  updateEdge: (id, patch) => {
    set((s) => ({ edges: s.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
    const cache = queryClient.getQueryData<EdgeRow[]>(invalidationKeys.edges);
    if (!cache) return;
    queryClient.setQueryData(
      invalidationKeys.edges,
      cache.map((r) => (r.slug === id ? { ...r, ...patch } : r)),
    );
  },
  removeEdge: (id) => {
    set((s) => ({ edges: s.edges.filter((e) => e.id !== id) }));
    const cache = queryClient.getQueryData<EdgeRow[]>(invalidationKeys.edges);
    if (cache) queryClient.setQueryData(invalidationKeys.edges, cache.filter((r) => r.slug !== id));
  },
  setNodePosition: (id, x, y) =>
    set((s) => {
      const prev = s.nodesMap[id];
      if (!prev) return s;
      return { nodesMap: { ...s.nodesMap, [id]: { ...prev, x, y } } };
    }),
  pinNode: (id, { x, y }) => {
    set((s) => {
      const prev = s.nodesMap[id];
      if (!prev) return s;
      return { nodesMap: { ...s.nodesMap, [id]: { ...prev, x, y } } };
    });
    const cache = queryClient.getQueryData<NodeRow[]>(invalidationKeys.nodes);
    if (!cache) return;
    queryClient.setQueryData(
      invalidationKeys.nodes,
      cache.map((r) => (r.slug === id ? { ...r, properties: { ...r.properties, x, y } } : r)),
    );
  },

  // ui
  selectedId: null,
  sidepanelOpen: false,
  chatOpen: false,
  chatCollapsed: false,
  searchOpen: false,
  layersOpen: false,
  newNodeOpen: false,
  ocrOpen: false,
  aboutOpen: false,
  reviewOpen: false,
  toast: null,
  zoomPct: 100,
  zoomIntent: null,
  panIntent: null,
  canvasCenter: { x: 0, y: 0 },
  welcome: true,
  hint: true,
  selectNode: (id) =>
    set(() => ({
      selectedId: id,
      sidepanelOpen: id !== null,
      searchOpen: false,
      layersOpen: false,
    })),
  clearSelection: () => set({ selectedId: null, sidepanelOpen: false }),
  addDraftNode: (draft) => set((s) => ({ draftNodes: [...s.draftNodes, draft] })),
  updateDraftNode: (id, patch) =>
    set((s) => ({ draftNodes: s.draftNodes.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
  removeDraftNode: (id) =>
    set((s) => ({
      draftNodes: s.draftNodes.filter((d) => d.id !== id),
      draftEdges: s.draftEdges.filter((e) => e.source !== id && e.target !== id),
      ...(s.selectedId === id ? { selectedId: null, sidepanelOpen: false } : {}),
    })),
  addDraftEdge: (draft) => set((s) => ({ draftEdges: [...s.draftEdges, draft] })),
  removeDraftEdge: (id) => set((s) => ({ draftEdges: s.draftEdges.filter((e) => e.id !== id) })),
  clearDrafts: () =>
    set((s) => ({
      draftNodes: [],
      draftEdges: [],
      ...(s.selectedId?.startsWith("draft-") ? { selectedId: null, sidepanelOpen: false } : {}),
    })),
  selectDraft: (id) =>
    set({ selectedId: id, sidepanelOpen: id !== null, searchOpen: false, layersOpen: false }),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen, chatCollapsed: false })),
  toggleCollapsed: () => set((s) => ({ chatCollapsed: !s.chatCollapsed })),
  setSearchOpen: (open) => set({ searchOpen: open }),
  setLayersOpen: (open) => set({ layersOpen: open }),
  setNewNodeOpen: (open) => set({ newNodeOpen: open }),
  setOcrOpen: (open) => set({ ocrOpen: open }),
  setAboutOpen: (open) => set({ aboutOpen: open }),
  setReviewOpen: (open) => set({ reviewOpen: open }),
  dismissWelcome: () => set({ welcome: false }),
  dismissHint: () => set({ hint: false }),
  pushToast: (t) => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: t });
    toastTimer = setTimeout(() => set({ toast: null }), 2500);
  },
  clearToast: () => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: null });
  },
  setZoomPct: (pct) => set({ zoomPct: pct }),
  zoomIn: () => set({ zoomIntent: "in" }),
  zoomOut: () => set({ zoomIntent: "out" }),
  setZoomIntent: (z) => set({ zoomIntent: z }),
  setPanIntent: (p) => set({ panIntent: p }),
  setCanvasCenter: (c) => set({ canvasCenter: c }),

  // visibility
  hiddenTypes: {
    person: false,
    family: false,
    landmark: false,
    toponym: false,
    event: false,
    path: false,
  },
  kindOn: { social: true, geo: true, hist: true },
  suggestOn: true,
  toggleType: (t) => set((s) => ({ hiddenTypes: { ...s.hiddenTypes, [t]: !s.hiddenTypes[t] } })),
  toggleKind: (k) => set((s) => ({ kindOn: { ...s.kindOn, [k]: !s.kindOn[k] } })),
  toggleSuggest: () => set((s) => ({ suggestOn: !s.suggestOn })),

  // review
  reviewQueue: REVIEW_SEED,
  pushReview: (item) => set((s) => ({ reviewQueue: [...s.reviewQueue, { ...item, id: uid() }] })),
  resolveReview: (id) => set((s) => ({ reviewQueue: s.reviewQueue.filter((r) => r.id !== id) })),

  // chat
  chatInput: "",
  chatMessages: [
    {
      id: "greet",
      role: "assistant",
      content: "Welcome! Ask me about people, places and stories of Potidaneia.",
    },
  ],
  setChatInput: (text) => set({ chatInput: text }),
  sendChat: (text) => {
    const content = text.trim();
    if (!content) return;
    set((s) => ({
      chatInput: "",
      chatOpen: true,
      chatCollapsed: false,
      chatMessages: [...s.chatMessages, { id: uid(), role: "user", content }],
    }));
    const { answer, path } = cannedAnswer(content);
    setTimeout(() => {
      set((s) => ({
        chatMessages: [...s.chatMessages, { id: uid(), role: "assistant", content: answer, path }],
      }));
    }, 700);
  },

  // flash / lit
  flashIds: [],
  litIds: [],
  litEdgeIds: [],
  flashNodes: (ids) => {
    if (flashTimer) clearTimeout(flashTimer);
    set({ flashIds: ids });
    flashTimer = setTimeout(() => set({ flashIds: [] }), 1800);
  },
  litPath: ({ nodeIds, edgeIds }) => {
    if (litTimer) clearTimeout(litTimer);
    set({ litIds: nodeIds, litEdgeIds: edgeIds });
    litTimer = setTimeout(() => set({ litIds: [], litEdgeIds: [] }), 6000);
  },
  clearLit: () => set({ litIds: [], litEdgeIds: [] }),

  // derived
  countByType: () => countByTypeHelper(Object.values(get().nodesMap)),
}));

export const selectAllNodes = (s: GraphStore): GraphNode[] => Object.values(s.nodesMap);

export const selectNodeById = (s: GraphStore, id: string | null): GraphNode | null =>
  id ? s.nodesMap[id] ?? null : null;

export const selectVisibleNodes = (s: GraphStore): GraphNode[] => {
  const base = Object.values(s.nodesMap).filter((n) => !s.hiddenTypes[n.type]);
  let draftEntry = draftGraphCache.get(s.draftNodes);
  if (!draftEntry || draftEntry.hidden !== s.hiddenTypes) {
    draftEntry = {
      hidden: s.hiddenTypes,
      nodes: s.draftNodes
        .filter((d) => !s.hiddenTypes[d.type])
        .map((d) => ({
          id: d.id,
          type: d.type,
          label: d.label,
          subtitle: d.subtitle ?? "",
          description: d.description ?? "",
          color: TYPE_META[d.type].color,
          mark: TYPE_META[d.type].glyph,
          x: d.x,
          y: d.y,
          draft: true,
        })),
    };
    draftGraphCache.set(s.draftNodes, draftEntry);
  }
  return [...base, ...draftEntry.nodes];
};
