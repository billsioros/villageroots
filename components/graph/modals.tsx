"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { X, UploadCloud, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGraphStore } from "@/store/graphStore";

export function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40" onMouseDown={onClose}>
      <div
        className="w-[420px] rounded-2xl bg-card p-5 shadow-elev-raised"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
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
  const pushToast = useGraphStore((s) => s.pushToast);
  const [step, setStep] = useState<"drop" | "progress" | "review">("drop");
  const [progress, setProgress] = useState(0);
  const [name, setName] = useState("");
  const [born, setBorn] = useState("");
  const [note, setNote] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  if (!open) return null;

  const start = () => {
    setStep("progress");
    setProgress(0);
    let i = 0;
    timerRef.current = setInterval(() => {
      i += 1;
      setProgress(Math.min(i * 6, 96));
      if (i >= 16) {
        clearInterval(timerRef.current!);
        setName("Stavroula Katsari");
        setBorn("1924");
        setNote("Baptized at Agios Ioannis, Potidaneia. Handwritten family record, page 3.");
        setStep("review");
      }
    }, 160);
  };

  const close = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setOpen(false);
    setTimeout(() => setStep("drop"), 200);
  };

  const submit = () => {
    pushToast({ tone: "success", message: "Imported record submitted for moderation" });
    close();
  };

  return (
    <ModalShell title="Import a document" onClose={close}>
      {step === "drop" && (
        <button onClick={start} className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border bg-surface-warm py-10 text-muted-foreground hover:border-primary hover:text-foreground">
          <UploadCloud size={22} />
          <span className="text-[13px] font-medium">Drop a photo or scan here</span>
          <span className="text-[11px]">Handwritten records, letters, land deeds…</span>
        </button>
      )}
      {step === "progress" && (
        <div className="py-6">
          <div className="mb-3 flex items-center gap-2 text-[13px] text-muted-foreground">
            <Sparkles size={14} className="animate-pulse text-primary" />
            {progress <= 24 ? "Reading handwriting…" : progress <= 48 ? "Finding names & dates…" : progress <= 72 ? "Matching toponyms…" : "Pre-filling form…"}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-warm">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
      {step === "review" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <Sparkles size={13} className="text-primary" /> OCR confidence <span className="font-semibold text-foreground">91%</span>
          </div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="rounded-xl border bg-surface-warm px-3.5 py-2.5 text-[13px] outline-none focus:border-primary" />
          <input value={born} onChange={(e) => setBorn(e.target.value)} placeholder="Born" className="rounded-xl border bg-surface-warm px-3.5 py-2.5 text-[13px] outline-none focus:border-primary" />
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notes" rows={3} className="resize-none rounded-xl border bg-surface-warm px-3.5 py-2.5 text-[13px] outline-none focus:border-primary" />
          <div className="mt-1 flex justify-end gap-2">
            <Button variant="ghost" size="sm" className="rounded-full" onClick={close}>
              Discard
            </Button>
            <Button size="sm" className="rounded-full" onClick={submit}>
              Queue for review
            </Button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

export function AboutModal() {
  const open = useGraphStore((s) => s.aboutOpen);
  const setOpen = useGraphStore((s) => s.setAboutOpen);

  if (!open) return null;

  const phases = [
    ["01", "Infinite canvas & core editor", true],
    ["02", "External context & rich media", false],
    ["03", "OCR — try it", false],
    ["04", "GraphRAG chat + AI link suggestions", false],
  ] as const;

  return (
    <ModalShell title="How this maps to the roadmap" onClose={() => setOpen(false)}>
      <div className="flex flex-col gap-2">
        {phases.map(([n, label, live]) => (
          <div key={n} className="flex items-center gap-3 rounded-xl border px-3.5 py-3">
            <span className="text-[13px] font-semibold text-primary">{n}</span>
            <span className="text-[13px]">{label}</span>
            <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] ${live ? "bg-primary/10 text-primary" : "bg-surface-warm text-muted-foreground"}`}>
              {live ? "Live here" : "Coming next"}
            </span>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}
