"use client";

import { Search, Plus, Upload, Layers } from "lucide-react";
import { useGraphStore } from "@/store/graphStore";

export function Dock() {
  const setSearchOpen = useGraphStore((s) => s.setSearchOpen);
  const setNewNodeOpen = useGraphStore((s) => s.setNewNodeOpen);
  const setOcrOpen = useGraphStore((s) => s.setOcrOpen);
  const setLayersOpen = useGraphStore((s) => s.setLayersOpen);
  const layersOpen = useGraphStore((s) => s.layersOpen);

  const items = [
    { label: "Search", icon: Search, onClick: () => setSearchOpen(true), active: false },
    { label: "New node", icon: Plus, onClick: () => setNewNodeOpen(true), active: false },
    { label: "Import document", icon: Upload, onClick: () => setOcrOpen(true), active: false },
    { label: "Layers", icon: Layers, onClick: () => setLayersOpen(!layersOpen), active: layersOpen },
  ];

  return (
    <div className="absolute bottom-5 right-5 flex gap-3">
      {items.map((item) => (
        <button
          key={item.label}
          onClick={item.onClick}
          title={item.label}
          className={`grid h-12 w-12 place-items-center rounded-full border shadow-elev-raised transition-colors ${
            item.active ? "bg-primary text-primary-foreground" : "bg-card/90 text-foreground backdrop-blur hover:bg-surface-warm"
          }`}
          aria-label={item.label}
        >
          <item.icon size={18} />
        </button>
      ))}
    </div>
  );
}
