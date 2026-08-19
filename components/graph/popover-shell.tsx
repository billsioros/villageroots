"use client";

import { ReactNode, useEffect, useRef } from "react";
import { X } from "lucide-react";

export function PopoverShell({
  title,
  anchor = "right",
  onClose,
  children,
}: {
  title: string;
  anchor?: "right" | "top";
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [onClose]);

  const pos =
    anchor === "right"
      ? "right-5 top-5 origin-top-right"
      : "bottom-20 left-1/2 -translate-x-1/2 origin-bottom";

  return (
    <div
      ref={ref}
      className={`absolute ${pos} z-40 w-[360px] animate-[modal-in_0.2s_ease] rounded-2xl border bg-card shadow-elev-raised`}
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="text-[13px] font-semibold">{title}</div>
        <button
          onClick={onClose}
          className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-surface-warm"
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>
      {children}
    </div>
  );
}
