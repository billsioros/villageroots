"use client";

import { useGraphStore } from "@/store/graphStore";

const MINOR = 16;
const MAJOR = 80;

export function GraphGrid() {
  const zoomScale = useGraphStore((s) => s.zoomScale);
  const minor = MINOR * zoomScale;
  const major = MAJOR * zoomScale;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(34,34,34,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(34,34,34,0.06) 1px, transparent 1px)",
          backgroundSize: `${minor}px ${minor}px`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(34,34,34,0.13) 1px, transparent 1px), linear-gradient(to bottom, rgba(34,34,34,0.13) 1px, transparent 1px)",
          backgroundSize: `${major}px ${major}px`,
        }}
      />
    </div>
  );
}
