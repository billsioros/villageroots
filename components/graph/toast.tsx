"use client";

import { useEffect } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useGraphStore } from "@/store/graphStore";

export function Toast() {
  const toast = useGraphStore((s) => s.toast);
  const clearToast = useGraphStore((s) => s.clearToast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(clearToast, 2500);
    return () => clearTimeout(t);
  }, [toast, clearToast]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex items-center gap-2.5 rounded-xl border bg-foreground px-4 py-3 text-[13px] text-background shadow-elev-raised">
      {toast.tone === "error" ? (
        <AlertCircle size={15} className="text-warn" />
      ) : (
        <CheckCircle2 size={15} className="text-success" />
      )}
      {toast.message}
    </div>
  );
}
