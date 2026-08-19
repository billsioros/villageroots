"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { X, UploadCloud, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGraphStore } from "@/store/graphStore";

export function ModalShell({ title, onClose, children, className }: { title: string; onClose: () => void; children: ReactNode; className?: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 animate-[modal-bg-in_0.2s_ease] backdrop-blur-sm" onMouseDown={onClose}>
      <div
        className={`w-[420px] rounded-2xl bg-card p-6 shadow-elev-raised animate-[modal-in_0.2s_ease] ${className ?? ""}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-surface-warm" aria-label="Close">
            <X size={14} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function OcrModal() {
  const open = useGraphStore((s) => s.ocrOpen);
  const setOpen = useGraphStore((s) => s.setOcrOpen);

  if (!open) return null;

  return (
    <ModalShell title="Import document" onClose={() => setOpen(false)} className="w-[520px] max-w-[95vw]">
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
          <UploadCloud size={28} />
        </div>
        <div>
          <p className="text-sm font-medium">Drop a document or click to upload</p>
          <p className="mt-1 text-xs text-muted-foreground">PDF, JPG or PNG — OCR will extract text automatically</p>
        </div>
        <Button size="sm" className="rounded-full">Choose file</Button>
      </div>
    </ModalShell>
  );
}

export function AboutModal() {
  const open = useGraphStore((s) => s.aboutOpen);
  const setOpen = useGraphStore((s) => s.setAboutOpen);

  if (!open) return null;

  return (
    <ModalShell title="VillageRoots" onClose={() => setOpen(false)}>
      <div className="flex flex-col gap-3 text-sm text-muted-foreground">
        <p>An infinite knowledge graph of village heritage — connecting people, places, and stories across generations.</p>
        <div className="flex items-center gap-2 rounded-lg bg-surface-warm px-3 py-2 text-xs">
          <Sparkles size={14} className="text-primary" />
          <span>AI-powered search and suggestions coming soon</span>
        </div>
      </div>
    </ModalShell>
  );
}
