"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { Extension, type Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import Suggestion from "@tiptap/suggestion";
import { ExternalEmbed } from "./external-embed-extension";
import { SlashMenu, type SlashMenuItem, type SlashMenuRef } from "./slash-menu";
import type { RichTextJSON } from "@/lib/graph/types";
import { emptyDoc, isEmptyDoc } from "@/lib/graph/rich-text-utils";
import { Loader2, Check, Link as LinkIcon } from "lucide-react";
import "./editor-flat.css";

export type SaveState = "idle" | "saving" | "saved" | "error";

export interface RichTextEditorProps {
  initialContent?: RichTextJSON | null;
  onSave: (json: RichTextJSON) => Promise<void>;
  placeholder?: string;
}

const DEBOUNCE_MS = 1000;

function ToolButton({
  label,
  title,
  active,
  onClick,
  children,
}: {
  label: string;
  title: string;
  active?: boolean;
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`grid h-6 min-w-6 place-items-center rounded px-1 text-[13px] ${
        active ? "bg-surface-warm font-medium" : "text-muted-foreground"
      }`}
    >
      {children ?? label}
    </button>
  );
}

export function RichTextEditor({ initialContent, onSave, placeholder }: RichTextEditorProps) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(onSave);
  saveRef.current = onSave;
  const editorRef = useRef<Editor | null>(null);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    const json = editorRef.current?.getJSON() as unknown as RichTextJSON;
    if (!json) return;
    setSaveState("saving");
    try {
      await saveRef.current(json);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, []);

  const slashItems = (): SlashMenuItem[] => [
    {
      title: "Heading 1",
      keywords: ["h1"],
      onSelect: ({ editor: e }) => e.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      title: "Heading 2",
      keywords: ["h2"],
      onSelect: ({ editor: e }) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      title: "Bullet list",
      keywords: ["list", "ul"],
      onSelect: ({ editor: e }) => e.chain().focus().toggleBulletList().run(),
    },
    {
      title: "Checklist",
      keywords: ["task", "todo"],
      onSelect: ({ editor: e }) => e.chain().focus().toggleTaskList().run(),
    },
    {
      title: "Bold",
      keywords: ["strong"],
      onSelect: ({ editor: e }) => e.chain().focus().toggleBold().run(),
    },
    {
      title: "Italic",
      keywords: ["em"],
      onSelect: ({ editor: e }) => e.chain().focus().toggleItalic().run(),
    },
    {
      title: "Blockquote",
      keywords: ["quote", "blockquote"],
      onSelect: ({ editor: e }) => e.chain().focus().toggleBlockquote().run(),
    },
    {
      title: "Code block",
      keywords: ["code", "pre"],
      onSelect: ({ editor: e }) => e.chain().focus().toggleCodeBlock().run(),
    },
    {
      title: "Divider",
      keywords: ["hr", "divider", "line", "---"],
      onSelect: ({ editor: e }) => e.chain().focus().setHorizontalRule().run(),
    },
    {
      title: "Ordered list",
      keywords: ["ol", "numbered", "1."],
      onSelect: ({ editor: e }) => e.chain().focus().toggleOrderedList().run(),
    },
    {
      title: "External embed",
      keywords: ["embed", "link", "wikipedia", "map"],
      onSelect: ({ editor: e }) => {
        const url = window.prompt("Paste a URL to embed (Wikipedia, Google Maps, or any link)");
        if (url) void insertEmbed(e, url);
      },
    },
  ];

  async function insertEmbed(editor: Editor, url: string) {
    try {
      const res = await fetch("/api/parse-embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const body = (await res.json()) as
        | { ok: true; data: Record<string, unknown> }
        | { ok: false; error: string };
      if (body.ok) {
        editor.chain().focus().insertContent({ type: "externalEmbed", attrs: body.data }).run();
      } else {
        editor.chain().focus().insertContent(`<a href="${url}">${url}</a>`).run();
      }
    } catch {
      editor.chain().focus().insertContent(`<a href="${url}">${url}</a>`).run();
    }
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: placeholder ?? "Write the story…" }),
      ExternalEmbed,
      Extension.create({
        name: "slashMenu",
        addProseMirrorPlugins() {
          return [
            Suggestion({
              editor: this.editor,
              char: "/",
              command: ({ editor: e, range, props }) => {
                e.chain().focus().deleteRange(range).run();
                props.onSelect({ editor: e });
              },
              items: ({ query }) =>
                slashItems().filter((it) =>
                  `${it.title} ${(it.keywords ?? []).join(" ")}`.toLowerCase().includes(query.toLowerCase()),
                ),
              render: () => {
                const holder = document.createElement("div");
                holder.style.cssText =
                  "position:fixed;z-index:50;left:0;top:0;pointer-events:none;";
                document.body.appendChild(holder);

                let root: Root | null = null;
                let menuRef: SlashMenuRef | null = null;

                const position = (props: { clientRect?: (() => DOMRect | null) | null }) => {
                  const rect = props.clientRect?.();
                  if (!rect) return;
                  holder.style.left = `${rect.left}px`;
                  holder.style.top = `${rect.bottom + 4}px`;
                };

                const renderMenu = (props: {
                  items: SlashMenuItem[];
                  editor: Editor;
                  command: (item: SlashMenuItem) => void;
                }) => {
                  root ??= createRoot(holder);
                  root.render(
                    createPortal(
                      <SlashMenu
                        items={props.items}
                        editor={props.editor}
                        command={props.command}
                        ref={(ref) => {
                          menuRef = ref;
                        }}
                      />,
                      holder,
                    ),
                  );
                };

                return {
                  onStart: (props) => {
                    renderMenu(props);
                    position(props);
                    holder.style.pointerEvents = "auto";
                  },
                  onUpdate: (props) => {
                    renderMenu(props);
                    position(props);
                  },
                  onKeyDown: ({ event }) => {
                    if (event.key === "Escape") {
                      return true;
                    }
                    return menuRef?.onKeyDown({ event }) ?? false;
                  },
                  onExit: () => {
                    root?.unmount();
                    root = null;
                    holder.remove();
                  },
                };
              },
            }),
          ];
        },
      }),
    ],
    content: isEmptyDoc(initialContent) ? (emptyDoc() as never) : initialContent,
    onCreate: ({ editor: e }) => {
      editorRef.current = e;
    },
    onUpdate: ({ editor: e }) => {
      setSaveState("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        const json = e.getJSON() as unknown as RichTextJSON;
        setSaveState("saving");
        try {
          await saveRef.current(json);
          setSaveState("saved");
        } catch {
          setSaveState("error");
        }
      }, DEBOUNCE_MS);
    },
  });

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-end gap-2 text-[11px] text-muted-foreground">
        {saveState === "saving" && (
          <span className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving…
          </span>
        )}
        {saveState === "saved" && (
          <span className="flex items-center gap-1 text-emerald-600">
            <Check className="h-3 w-3" /> Saved
          </span>
        )}
        {saveState === "error" && (
          <button type="button" className="text-destructive underline" onClick={() => void flush()}>
            Save failed — retry
          </button>
        )}
      </div>
      <div className="editor-flat" onClick={() => editor?.commands.focus()}>
        <EditorContent editor={editor} />
        {editor && (
          <BubbleMenu
            editor={editor}
            className="flex items-center gap-0.5 rounded-lg border border-border bg-white p-1 shadow-lg"
          >
          <ToolButton
            active={editor?.isActive("bold")}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            label="B"
            title="Bold"
          />
          <ToolButton
            active={editor?.isActive("italic")}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            label="I"
            title="Italic"
          />
          <ToolButton
            active={editor?.isActive("underline")}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            label="U"
            title="Underline"
          />
          <ToolButton
            active={editor?.isActive("strike")}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            label="S"
            title="Strike"
          />
          <span className="mx-1 h-4 w-px bg-border" />
          <select
            value={
              editor?.isActive("heading", { level: 1 })
                ? "h1"
                : editor?.isActive("heading", { level: 2 })
                  ? "h2"
                  : "p"
            }
            onChange={(e) => {
              const v = e.target.value;
              if (v === "p") editor?.chain().focus().setParagraph().run();
              else editor?.chain().focus().setHeading({ level: Number(v[1]) as 1 | 2 }).run();
            }}
            className="rounded border border-border bg-white px-1 text-[12px]"
          >
            <option value="p">Paragraph</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
          </select>
          <ToolButton
            title="Link"
            label="link"
            onClick={() => {
              const url = window.prompt("Link URL");
              if (url) editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
            }}
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </ToolButton>
          </BubbleMenu>
        )}
      </div>
    </div>
  );
}
