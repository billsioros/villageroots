"use client";

import { useEffect, useState } from "react";
import { Search, Plus, Upload, Layers, ShieldCheck, /* Sparkles, */ SlidersHorizontal, GitBranch } from "lucide-react";
import { useGraphStore } from "@/store/graphStore";

export function Dock() {
  const setSearchOpen = useGraphStore((s) => s.setSearchOpen);
  const setNewNodeOpen = useGraphStore((s) => s.setNewNodeOpen);
  const setOcrOpen = useGraphStore((s) => s.setOcrOpen);
  const setLayersOpen = useGraphStore((s) => s.setLayersOpen);
  const layersOpen = useGraphStore((s) => s.layersOpen);
  const physicsOpen = useGraphStore((s) => s.physicsOpen);
  const setPhysicsOpen = useGraphStore((s) => s.setPhysicsOpen);
  const setAdminDialogOpen = useGraphStore((s) => s.setAdminDialogOpen);
  // const toggleChat = useGraphStore((s) => s.toggleChat);
  const activeView = useGraphStore((s) => s.activeView);
  const setActiveView = useGraphStore((s) => s.setActiveView);

  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/me/role")
      .then((r) => r.json())
      .then((j: { role: string | null }) => {
        if (active) setIsAdmin(j.role === "admin");
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  return (
    <div className="absolute bottom-5 right-5 z-50 flex gap-3">
      <button title="Search" onClick={() => setSearchOpen(true)} className="grid h-12 w-12 place-items-center rounded-full border shadow-elev-raised transition-colors bg-card/90 text-foreground backdrop-blur hover:bg-surface-warm" aria-label="Search">
        <Search size={18} />
      </button>
      <button title="New node" onClick={() => setNewNodeOpen(true)} className="grid h-12 w-12 place-items-center rounded-full border shadow-elev-raised transition-colors bg-card/90 text-foreground backdrop-blur hover:bg-surface-warm" aria-label="New node">
        <Plus size={18} />
      </button>
      <button title="Import document" onClick={() => setOcrOpen(true)} className="grid h-12 w-12 place-items-center rounded-full border shadow-elev-raised transition-colors bg-card/90 text-foreground backdrop-blur hover:bg-surface-warm" aria-label="Import document">
        <Upload size={18} />
      </button>
      <button
        type="button"
        onClick={() => setActiveView(activeView === 'TREE' ? 'GRAPH' : 'TREE')}
        className={
          activeView === 'TREE'
            ? 'grid h-12 w-12 place-items-center rounded-full border bg-primary text-primary-foreground shadow-elev-raised transition-colors'
            : 'grid h-12 w-12 place-items-center rounded-full border bg-card/90 text-foreground shadow-elev-raised transition-colors backdrop-blur hover:bg-surface-warm'
        }
        title="Tree view"
        aria-label="Toggle ancestral tree view"
      >
        <GitBranch size={20} />
      </button>
      {/* <button title="Chat" onClick={toggleChat} className="grid h-12 w-12 place-items-center rounded-full border shadow-elev-raised transition-colors bg-card/90 text-foreground backdrop-blur hover:bg-surface-warm" aria-label="Chat">
        <Sparkles size={18} />
      </button> */}
      {isAdmin && (
        <button title="Admin" onClick={() => setAdminDialogOpen(true)} className="grid h-12 w-12 place-items-center rounded-full border shadow-elev-raised transition-colors bg-card/90 text-foreground backdrop-blur hover:bg-surface-warm" aria-label="Admin">
          <ShieldCheck size={18} />
        </button>
      )}
      <button title="Layers" onClick={() => setLayersOpen(!layersOpen)} className={`grid h-12 w-12 place-items-center rounded-full border shadow-elev-raised transition-colors ${layersOpen ? "bg-primary text-primary-foreground" : "bg-card/90 text-foreground backdrop-blur hover:bg-surface-warm"}`} aria-label="Layers">
        <Layers size={18} />
      </button>
      <button title="Physics" onClick={() => setPhysicsOpen(!physicsOpen)} className={`grid h-12 w-12 place-items-center rounded-full border shadow-elev-raised transition-colors ${physicsOpen ? "bg-primary text-primary-foreground" : "bg-card/90 text-foreground backdrop-blur hover:bg-surface-warm"}`} aria-label="Physics">
        <SlidersHorizontal size={18} />
      </button>
    </div>
  );
}
