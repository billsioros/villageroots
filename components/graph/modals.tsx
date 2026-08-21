"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { X, UploadCloud, Sparkles, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGraphStore } from "@/store/graphStore";
import { createClient } from "@/lib/supabase/client";
import { validateScanFile } from "@/lib/ocr/validate-file";
import type { DraftEdge, DraftNode } from "@/lib/graph/types";

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

const SCAN_ACCEPT = ".jpg,.jpeg,.png,.webp";

export function OcrModal() {
  const open = useGraphStore((s) => s.ocrOpen);
  const setOpen = useGraphStore((s) => s.setOcrOpen);
  const setNewNodeOpen = useGraphStore((s) => s.setNewNodeOpen);
  const setNewNodeStartStep = useGraphStore((s) => s.setNewNodeStartStep);
  const addDraftNode = useGraphStore((s) => s.addDraftNode);
  const addDraftEdge = useGraphStore((s) => s.addDraftEdge);
  const clearDrafts = useGraphStore((s) => s.clearDrafts);
  const canvasCenter = useGraphStore((s) => s.canvasCenter);
  const pushToast = useGraphStore((s) => s.pushToast);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "uploading" | "extracting">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!open) return null;

  const busy = phase !== "idle";

  const reset = () => {
    setFile(null);
    setPhase("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleError = (message: string) => {
    pushToast({ tone: "error", message });
    reset();
  };

  const pickFile = (picked: File | null) => {
    if (!picked || busy) return;
    const problem = validateScanFile(picked);
    if (problem) {
      pushToast({ tone: "error", message: problem });
      return;
    }
    setPhase("idle");
    setFile(picked);
  };

  const run = async () => {
    if (!file || busy) return;
    setPhase("uploading");

    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return handleError("Sign in to import documents");

    const extension = file.name.split(".").pop()!.toLowerCase();
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("archive-scans")
      .upload(path, file, { contentType: file.type });
    if (uploadError) return handleError("Upload failed — try again");

    setPhase("extracting");
    let response: Response;
    try {
      response = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
    } catch {
      return handleError("Extraction failed — try again");
    }

    if (response.status === 401) return handleError("Sign in to import documents");
    if (response.status === 400 || response.status === 404)
      return handleError("Scan not found — please re-upload");
    if (response.status === 503) return handleError("OCR is not configured yet");
    if (!response.ok) return handleError("Extraction failed — try again");

    const drafts = (await response.json()) as { nodes: DraftNode[]; edges: DraftEdge[] };
    if (!drafts.nodes?.length) {
      return handleError("Nothing could be read from this scan");
    }

    clearDrafts();
    drafts.nodes.forEach((node, index) => {
      addDraftNode({
        ...node,
        x: canvasCenter.x + (Math.random() - 0.5) * 160 + index * 14,
        y: canvasCenter.y + (Math.random() - 0.5) * 160 + index * 14,
      });
    });
    for (const edge of drafts.edges ?? []) addDraftEdge(edge);

    setOpen(false);
    reset();
    setNewNodeStartStep("weave");
    setNewNodeOpen(true);
    pushToast({
      tone: "success",
      message: `Extracted ${drafts.nodes.length} ${drafts.nodes.length === 1 ? "entry" : "entries"} — review them below`,
    });
  };

  return (
    <ModalShell title="Import document" onClose={() => { if (!busy) { setOpen(false); reset(); } }}>
      <input
        ref={inputRef}
        type="file"
        accept={SCAN_ACCEPT}
        className="hidden"
        onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
      />

      {!file ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pickFile(e.dataTransfer.files?.[0] ?? null);
          }}
          className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-10 text-center transition-colors hover:bg-surface-warm disabled:opacity-60"
        >
          <UploadCloud size={22} className="text-muted-foreground" />
          <span className="text-sm font-medium">Choose a file or drop it here</span>
          <span className="text-xs text-muted-foreground">JPG, PNG or WebP · up to 10MB</span>
        </button>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border bg-surface-warm/50 p-3">
            {previewUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={previewUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">{Math.ceil(file.size / 1024)} KB</p>
            </div>
            {!busy && (
              <Button size="sm" variant="ghost" onClick={reset}>
                Remove
              </Button>
            )}
          </div>

          {busy ? (
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
              <LoaderCircle size={16} className="animate-spin" />
              {phase === "uploading" ? "Uploading scan…" : "Reading document…"}
            </div>
          ) : (
            <Button className="w-full gap-2" onClick={run}>
              <Sparkles size={14} />
              Extract with AI
            </Button>
          )}
        </div>
      )}
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
