import { create } from "zustand";
import { uid, countByType as countByTypeHelper, TYPE_META } from "@/lib/graph/helpers";
import { pickFocalPerson } from "@/lib/graph/tree";
import { toNodeRow, toEdgeRow } from "@/lib/graph/mappers";
import { queryClient } from "@/lib/graph/query-client";
import { invalidationKeys } from "@/lib/graph/queries";
import type { ForceConfig } from "@/lib/graph/force-config";
import { DEFAULT_FORCE_CONFIG } from "@/lib/graph/force-config";
import type { NodeRow, EdgeRow } from "@/drizzle/schema";
import type {
  GraphNode,
  GraphEdge,
  SuggestedEdge,
  NodeType,
  EdgeKind,
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
  profileOpen: boolean;
  adminDialogOpen: boolean;
  adminDialogTab: "users" | "review";
  activeView: "GRAPH" | "TREE";
  focalPersonId: string | null;
  toast: Toast | null;
  zoomPct: number;
  zoomIntent: ZoomIntent;
  panIntent: PanIntent | null;
  canvasCenter: { x: number; y: number };

  // physics
  forceConfig: ForceConfig;
  setForceConfig: (patch: Partial<ForceConfig>) => void;
  resetForceConfig: () => void;
  physicsOpen: boolean;
  setPhysicsOpen: (open: boolean) => void;

  // viewport
  viewportBounds: { x1: number; y1: number; x2: number; y2: number };
  setViewportBounds: (b: { x1: number; y1: number; x2: number; y2: number }) => void;

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
  setProfileOpen: (open: boolean) => void;
  setAdminDialogOpen: (open: boolean) => void;
  setAdminDialogTab: (tab: "users" | "review") => void;
  setActiveView: (view: "GRAPH" | "TREE") => void;
  setFocalPersonId: (id: string | null) => void;
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
  edgeIds: ["e-mill-nikolas", "e-yiannis-nik"],
};

const CHURCH_PATH = {
  nodeIds: ["l-church", "p-yiannis", "p-maria"],
  edgeIds: ["e-yiannis-church", "e-maria-church"],
};

function cannedAnswer(text: string): {
  answer: string;
  path?: { nodeIds: string[]; edgeIds: string[] };
} {
  const q = text.toLowerCase();

  const KNOWN_QUERIES: { match: RegExp; nodeId: string; path?: typeof MILL_PATH }[] = [
    { match: /mill|kalyvia/, nodeId: "l-mill", path: MILL_PATH },
    { match: /church|ioannis/, nodeId: "l-church", path: CHURCH_PATH },
    { match: /bridge|kamares/, nodeId: "l-bridge" },
    { match: /plane|tree|gathering/, nodeId: "l-plane" },
    { match: /petra|rock/, nodeId: "t-petra" },
    { match: /lakka|hollow/, nodeId: "t-lakka" },
    { match: /school/, nodeId: "e-school" },
    { match: /feast|harvest/, nodeId: "e-feast" },
    { match: /charter|founding/, nodeId: "e-charter" },
    { match: /emigrat/, nodeId: "e-emigrate" },
    { match: /drakia|mule|track/, nodeId: "d-drakia" },
  ];

  const store = useGraphStore.getState();

  for (const { match, nodeId, path } of KNOWN_QUERIES) {
    if (match.test(q)) {
      const node = store.nodesMap[nodeId];
      if (node) {
        const desc = node.description || node.subtitle || "";
        return { answer: `${node.label} — ${desc}`, path };
      }
    }
  }

  const nodeValues = Object.values(store.nodesMap);
  const match = nodeValues.find(
    (n) =>
      n.label.toLowerCase().includes(q) ||
      n.subtitle.toLowerCase().includes(q)
  );
  if (match) {
    const desc = match.description || match.subtitle || "";
    return { answer: `${match.label} — ${desc}` };
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
  suggestedEdges: [],
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
        if (patch.documentContent !== undefined) rowPatch.documentContent = patch.documentContent;
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
  profileOpen: false,
  adminDialogOpen: false,
  adminDialogTab: "users",
  activeView: "GRAPH",
  focalPersonId: null,
  toast: null,
  zoomPct: 100,
  zoomIntent: null,
  panIntent: null,
  canvasCenter: { x: 0, y: 0 },

  // physics
  forceConfig: { ...DEFAULT_FORCE_CONFIG },
  setForceConfig: (patch) =>
    set((s) => ({ forceConfig: { ...s.forceConfig, ...patch } })),
  resetForceConfig: () => set({ forceConfig: { ...DEFAULT_FORCE_CONFIG } }),
  physicsOpen: false,
  setPhysicsOpen: (open) => set({ physicsOpen: open }),

  // viewport
  viewportBounds: { x1: -500, y1: -500, x2: 500, y2: 500 },
  setViewportBounds: (b) => set({ viewportBounds: b }),

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
  setProfileOpen: (profileOpen) => set({ profileOpen }),
  setAdminDialogOpen: (open) => set({ adminDialogOpen: open }),
  setAdminDialogTab: (tab) => set({ adminDialogTab: tab }),
  setFocalPersonId: (id) => set({ focalPersonId: id }),
  setActiveView: (view) => {
    const { activeView, focalPersonId, selectedId, nodesMap, setFocalPersonId } = get();
    if (view === activeView) return;
    if (view === "GRAPH") {
      set({ activeView: "GRAPH" });
      return;
    }
    const persons = Object.values(nodesMap).filter((n) => n.type === "person");
    if (persons.length === 0) return;
    const selected = selectedId && persons.some((p) => p.id === selectedId) ? selectedId : null;
    const focal = focalPersonId ?? selected ?? pickFocalPerson(persons)?.id ?? null;
    if (!focal) return;
    setFocalPersonId(focal);
    set({ activeView: "TREE" });
  },
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
