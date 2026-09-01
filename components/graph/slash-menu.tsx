"use client";

import { useState, useEffect, useImperativeHandle, forwardRef, type ReactNode } from "react";
import type { Editor } from "@tiptap/core";

export interface SlashMenuItem {
  title: string;
  keywords?: string[];
  onSelect: (props: { editor: Editor }) => void;
}

export interface SlashMenuRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export interface SlashMenuProps {
  items: SlashMenuItem[];
  editor?: Editor;
  command?: (item: SlashMenuItem) => void;
}

export const SlashMenu = forwardRef<SlashMenuRef, SlashMenuProps>(
  function SlashMenu({ items, editor, command }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    const selectItem = (index: number) => {
      const item = items[index];
      if (!item) return;
      if (command) {
        command(item);
      } else if (editor) {
        item.onSelect({ editor });
      } else {
        item.onSelect({ editor: { chain: () => undefined } as unknown as Editor });
      }
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((i) => (i - 1 + items.length) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((i) => (i + 1) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    return (
      <div className="max-h-72 overflow-y-auto rounded-xl border border-border bg-white p-1 shadow-lg">
        {items.length === 0 ? (
          <div className="px-3 py-2 text-[12px] text-muted-foreground">No results</div>
        ) : (
          items.map((item, index) => (
            <button
              key={item.title}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectItem(index)}
              className={`block w-full rounded-lg px-3 py-1.5 text-left text-[13px] ${
                index === selectedIndex ? "bg-surface-warm font-medium" : "text-foreground"
              }`}
            >
              {item.title}
            </button>
          ))
        )}
      </div>
    );
  },
);

export function SlashPopup({ children }: { children: ReactNode }) {
  return children;
}
