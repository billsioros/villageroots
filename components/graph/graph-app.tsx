"use client";

import { useEffect } from "react";
import { Topbar } from "./topbar";
import { GraphCanvas } from "./graph-canvas";
import { GraphGrid } from "./graph-grid";
import { Legend } from "./legend";
import { StageUi } from "./stage-ui";
import { Dock } from "./dock";
import { WelcomeCard } from "./welcome-card";
import { HintChip } from "./hint-chip";
import { Toast } from "./toast";
import { SearchPop } from "./search-pop";
import { LayersPop } from "./layers-pop";
import { SidePanel } from "./side-panel";
import { ChatPanel } from "./chat-panel";
import { ChatFab } from "./chat-fab";
import { ReviewQueue } from "./review-queue";
import { NewNodeModal, OcrModal, AboutModal } from "./modals";
import { GraphLoader } from "./graph-loader";
import { useGraphStore } from "@/store/graphStore";

export function GraphApp() {
  const searchOpen = useGraphStore((s) => s.searchOpen);
  const layersOpen = useGraphStore((s) => s.layersOpen);
  const reviewOpen = useGraphStore((s) => s.reviewOpen);
  const newNodeOpen = useGraphStore((s) => s.newNodeOpen);
  const ocrOpen = useGraphStore((s) => s.ocrOpen);
  const aboutOpen = useGraphStore((s) => s.aboutOpen);
  const clearSelection = useGraphStore((s) => s.clearSelection);
  const setSearchOpen = useGraphStore((s) => s.setSearchOpen);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === "Escape") {
        if (aboutOpen) return; // modal shells handle their own Escape
        if (newNodeOpen || ocrOpen) return;
        clearSelection();
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aboutOpen, newNodeOpen, ocrOpen, clearSelection, setSearchOpen]);

  return (
    <GraphLoader>
      <div className="relative flex h-full flex-1 flex-col overflow-hidden">
        <Topbar />
        <div className="relative min-h-0 flex-1">
          <GraphGrid />
          <GraphCanvas />
          <Legend />
          <StageUi />
          <Dock />
          <WelcomeCard />
          <HintChip />
          {searchOpen && <SearchPop />}
          {layersOpen && <LayersPop />}
          {reviewOpen && <ReviewQueue />}
          <SidePanel />
        </div>
        <ChatPanel />
        <ChatFab />
        <Toast />
        <NewNodeModal />
        <OcrModal />
        <AboutModal />
      </div>
    </GraphLoader>
  );
}
