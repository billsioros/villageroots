"use client";

import { useEffect } from "react";
import { Topbar } from "./topbar";
import { GraphCanvas } from "./graph-canvas";
import { GraphGrid } from "./graph-grid";

import { StageUi } from "./stage-ui";
import { Dock } from "./dock";
import { EmptyState } from "./empty-state";
import { HintChip } from "./hint-chip";
import { Toast } from "./toast";
import { SearchPop } from "./search-pop";
import { LayersPop } from "./layers-pop";
import { PhysicsPop } from "./physics-pop";
import { NodeEditorDialog } from "./node-editor-dialog";
import { ChatPanel } from "./chat-panel";
import { OcrModal, AboutModal } from "./modals";
import { ProfileModal } from "./profile-modal";
import ContributePanel from "./contribute-panel";
import { AdminReviewQueue } from "@/components/admin/review-queue";
import { GraphLoader } from "./graph-loader";
import { useGraphStore } from "@/store/graphStore";

export function GraphApp() {
  const searchOpen = useGraphStore((s) => s.searchOpen);
  const layersOpen = useGraphStore((s) => s.layersOpen);
  const physicsOpen = useGraphStore((s) => s.physicsOpen);
  const newNodeOpen = useGraphStore((s) => s.newNodeOpen);
  const ocrOpen = useGraphStore((s) => s.ocrOpen);
  const aboutOpen = useGraphStore((s) => s.aboutOpen);
  const chatOpen = useGraphStore((s) => s.chatOpen);
  const reviewQueueOpen = useGraphStore((s) => s.reviewQueueOpen);
  const profileOpen = useGraphStore((s) => s.profileOpen);
  const nodeCount = useGraphStore((s) => Object.keys(s.nodesMap).length);
  const clearSelection = useGraphStore((s) => s.clearSelection);
  const setSearchOpen = useGraphStore((s) => s.setSearchOpen);
  const setNewNodeOpen = useGraphStore((s) => s.setNewNodeOpen);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === "Escape") {
        if (aboutOpen || reviewQueueOpen || chatOpen || profileOpen) return; // modal shells handle their own Escape
        if (newNodeOpen) {
          setNewNodeOpen(false);
          return;
        }
        if (ocrOpen) return;
        clearSelection();
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aboutOpen, reviewQueueOpen, chatOpen, profileOpen, newNodeOpen, ocrOpen, clearSelection, setSearchOpen, setNewNodeOpen]);

  return (
    <GraphLoader>
      <div className="relative flex h-full flex-1 flex-col overflow-hidden">
        <Topbar />
        <div className="relative min-h-0 flex-1">
          <GraphGrid />
          <GraphCanvas />

          <StageUi />
          <Dock />
          <ContributePanel />
          {nodeCount === 0 && <EmptyState />}
          <HintChip />
          {searchOpen && <SearchPop />}
          {layersOpen && <LayersPop />}
          {physicsOpen && <PhysicsPop />}
          <NodeEditorDialog />
        </div>
        <ChatPanel />
        <Toast />
        <OcrModal />
        <AboutModal />
        <AdminReviewQueue />
        <ProfileModal />
      </div>
    </GraphLoader>
  );
}
