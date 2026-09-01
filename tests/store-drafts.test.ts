import { describe, it, expect, beforeEach, vi } from "vitest";

const mockQueryClient = vi.hoisted(() => ({
  getQueryData: vi.fn(),
  setQueryData: vi.fn(),
}));
vi.mock("@/lib/graph/query-client", () => ({ queryClient: mockQueryClient }));

import { useGraphStore, selectVisibleNodes } from "@/store/graphStore";
import { type DraftNode, type DraftEdge, type GraphNode } from "@/lib/graph/types";

const draft = (id: string, type: DraftNode["type"], label = id): DraftNode => ({
  id,
  type,
  label,
  x: 0,
  y: 0,
  draft: true,
});
const dedge = (id: string, source: string, target: string): DraftEdge => ({
  id,
  source,
  target,
  verb: "related_to",
  kind: "social",
  draft: true,
});
const node = (id: string, type: GraphNode["type"]): GraphNode => ({
  id,
  type,
  label: id,
  subtitle: "",
  description: "",
  color: "#e15a72",
  mark: "P",
  x: 0,
  y: 0,
});

describe("drafts slice", () => {
  beforeEach(() => {
    useGraphStore.setState({
      nodesMap: {},
      edges: [],
      suggestedEdges: [],
      draftNodes: [],
      draftEdges: [],
    });
    mockQueryClient.getQueryData.mockReset();
    mockQueryClient.setQueryData.mockReset();
    mockQueryClient.getQueryData.mockReturnValue(undefined);
  });

  it("adds draft nodes and edges without writing to the react-query cache", () => {
    useGraphStore.getState().addDraftNode(draft("draft-a", "person", "Yiayia"));
    useGraphStore.getState().addDraftEdge(dedge("draft-edge-1", "draft-a", "draft-b"));
    const s = useGraphStore.getState();
    expect(s.draftNodes).toHaveLength(1);
    expect(s.draftNodes[0].label).toBe("Yiayia");
    expect(s.draftEdges).toHaveLength(1);
    expect(mockQueryClient.setQueryData).not.toHaveBeenCalled();
  });

  it("updates a draft node", () => {
    useGraphStore.getState().addDraftNode(draft("draft-a", "person"));
    useGraphStore
      .getState()
      .updateDraftNode("draft-a", {
        description: "From Kato Potamia",
        documentContent: { type: "doc", content: [] },
        facts: { born: "1924" },
        deceased: true,
      });
    const d = useGraphStore.getState().draftNodes[0];
    expect(d.description).toBe("From Kato Potamia");
    expect(d.documentContent).toEqual({ type: "doc", content: [] });
    expect(d.facts?.born).toBe("1924");
    expect(d.deceased).toBe(true);
  });

  it("renames a draft node label and returns a fresh array (invalidates the canvas cache)", () => {
    useGraphStore.getState().addDraftNode(draft("draft-a", "person", "Old Name"));
    const before = useGraphStore.getState().draftNodes;
    useGraphStore.getState().updateDraftNode("draft-a", { label: "New Name" });
    const s = useGraphStore.getState();
    expect(s.draftNodes[0].label).toBe("New Name");
    expect(s.draftNodes).not.toBe(before);
  });

  it("removes a draft node and its connected draft edges", () => {
    useGraphStore.setState({
      draftNodes: [draft("draft-a", "person"), draft("draft-b", "family")],
      draftEdges: [dedge("e1", "draft-a", "draft-b")],
    });
    useGraphStore.getState().removeDraftNode("draft-a");
    const s = useGraphStore.getState();
    expect(s.draftNodes.map((d) => d.id)).toEqual(["draft-b"]);
    expect(s.draftEdges).toHaveLength(0);
  });

  it("removes a single draft edge and clears all drafts", () => {
    useGraphStore.setState({
      draftNodes: [draft("draft-a", "person")],
      draftEdges: [dedge("e1", "draft-a", "draft-b")],
    });
    useGraphStore.getState().removeDraftEdge("e1");
    expect(useGraphStore.getState().draftEdges).toHaveLength(0);
    useGraphStore.getState().clearDrafts();
    expect(useGraphStore.getState().draftNodes).toHaveLength(0);
    expect(useGraphStore.getState().draftEdges).toHaveLength(0);
  });

  it("selectDraft opens the side panel", () => {
    useGraphStore.getState().selectDraft("draft-a");
    const s = useGraphStore.getState();
    expect(s.selectedId).toBe("draft-a");
    expect(s.sidepanelOpen).toBe(true);
  });

  it("removeDraftNode clears the selection when the selected draft is removed", () => {
    useGraphStore.setState({
      draftNodes: [draft("draft-a", "person"), draft("draft-b", "family")],
      selectedId: "draft-a",
      sidepanelOpen: true,
    });
    useGraphStore.getState().removeDraftNode("draft-a");
    const s = useGraphStore.getState();
    expect(s.selectedId).toBeNull();
    expect(s.sidepanelOpen).toBe(false);
  });

  it("removeDraftNode keeps the selection when a non-selected draft is removed", () => {
    useGraphStore.setState({
      draftNodes: [draft("draft-a", "person"), draft("draft-b", "family")],
      selectedId: "draft-b",
      sidepanelOpen: true,
    });
    useGraphStore.getState().removeDraftNode("draft-a");
    const s = useGraphStore.getState();
    expect(s.selectedId).toBe("draft-b");
    expect(s.sidepanelOpen).toBe(true);
  });

  it("clearDrafts clears the selection when a draft is selected", () => {
    useGraphStore.setState({
      draftNodes: [draft("draft-a", "person")],
      selectedId: "draft-a",
      sidepanelOpen: true,
    });
    useGraphStore.getState().clearDrafts();
    const s = useGraphStore.getState();
    expect(s.draftNodes).toHaveLength(0);
    expect(s.selectedId).toBeNull();
    expect(s.sidepanelOpen).toBe(false);
  });

  it("selectVisibleNodes merges drafts flagged draft and honors hidden types", () => {
    useGraphStore.setState({
      nodesMap: { n1: node("n1", "family") },
      draftNodes: [draft("draft-a", "person", "Yiayia"), draft("draft-b", "landmark")],
      hiddenTypes: { person: false, family: false, landmark: true, toponym: false, event: false, path: false },
    });
    const visible = selectVisibleNodes(useGraphStore.getState());
    expect(visible.map((n) => n.id).sort()).toEqual(["draft-a", "n1"]);
    const da = visible.find((n) => n.id === "draft-a");
    expect(da?.draft).toBe(true);
    expect(da?.color).toBe("#e15a72");
    expect(da?.mark).toBe("P");
    expect(mockQueryClient.setQueryData).not.toHaveBeenCalled();
  });
});
