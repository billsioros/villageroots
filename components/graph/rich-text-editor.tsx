"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { Extension, type Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import Suggestion from "@tiptap/suggestion";
import { NodeSelection } from "@tiptap/pm/state";
import { ExternalEmbed } from "./external-embed-extension";
import { SlashMenu, type SlashMenuItem, type SlashMenuRef } from "./slash-menu";
import type { RichTextJSON } from "@/lib/graph/types";
import { emptyDoc, isEmptyDoc } from "@/lib/graph/rich-text-utils";
import { Loader2, Check, Link as LinkIcon, ChevronDown } from "lucide-react";
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
      className={`grid h-7 min-w-7 place-items-center rounded-lg px-1.5 text-[14px] transition-colors ${
        active
          ? "bg-fg-soft-2 font-semibold text-foreground"
          : "text-muted-foreground hover:bg-surface-warm hover:text-foreground"
      }`}
    >
      {children ?? label}
    </button>
  );
}

function BlockStyleMenu({ editor }: { editor: Editor | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = editor?.isActive("heading", { level: 1 })
    ? "Heading 1"
    : editor?.isActive("heading", { level: 2 })
      ? "Heading 2"
      : "Paragraph";

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const options = [
    {
      label: "Paragraph",
      run: () => editor?.chain().focus().setParagraph().run(),
    },
    {
      label: "Heading 1",
      run: () => editor?.chain().focus().setHeading({ level: 1 }).run(),
    },
    {
      label: "Heading 2",
      run: () => editor?.chain().focus().setHeading({ level: 2 }).run(),
    },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-lg bg-surface-warm py-1 pl-2.5 pr-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-fg-soft-2"
      >
        {current}
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-xl border border-border bg-white p-1 shadow-[0_8px_30px_rgba(0,0,0,0.14)]"
        >
          {options.map((option) => (
            <button
              key={option.label}
              type="button"
              role="option"
              aria-selected={option.label === current}
              onClick={() => {
                option.run();
                setOpen(false);
              }}
              className={`block w-full rounded-lg px-3 py-1.5 text-left text-[13px] transition-colors ${
                option.label === current
                  ? "bg-fg-soft-2 font-medium text-foreground"
                  : "text-muted-foreground hover:bg-surface-warm hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function RichTextEditor({ initialContent, onSave, placeholder }: RichTextEditorProps) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(onSave);
  saveRef.current = onSave;
  const editorRef = useRef<Editor | null>(null);

  const [slashMenu, setSlashMenu] = useState<{ items: SlashMenuItem[]; left: number; top: number } | null>(null);
  const slashMenuRef = useRef<SlashMenuRef | null>(null);
  const slashCommand = useRef<(item: SlashMenuItem) => void>(() => {});

  const positionSlash = (props: {
    items?: SlashMenuItem[];
    clientRect?: (() => DOMRect | null) | null;
    editor: Editor;
  }) => {
    let left = 0;
    let top = 0;
    const rect = props.clientRect?.() ?? null;
    if (rect) {
      left = rect.left;
      top = rect.bottom + 4;
    } else {
      try {
        const c = props.editor.view.coordsAtPos(props.editor.state.selection.$anchor.pos);
        left = c.left;
        top = c.bottom + 4;
      } catch {
        return null;
      }
    }
    return { items: props.items ?? [], left, top };
  };

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
      title: "Embed",
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
              shouldResetDismissed: () => true,
              command: ({ editor: e, range, props }) => {
                e.chain().focus().deleteRange(range).run();
                try {
                  props.onSelect({ editor: e });
                } catch (err) {
                  console.error("[slash] command failed", err);
                }
              },
              items: ({ query }) =>
                slashItems().filter((it) =>
                  `${it.title} ${(it.keywords ?? []).join(" ")}`.toLowerCase().includes(query.toLowerCase()),
                ),
              render: () => ({
                onStart: (props) => {
                  slashCommand.current = props.command;
                  const pos = positionSlash(props);
                  if (pos) setSlashMenu(pos);
                },
                onUpdate: (props) => {
                  slashCommand.current = props.command;
                  const pos = positionSlash(props);
                  if (pos) setSlashMenu(pos);
                },
                onKeyDown: ({ event }) => {
                  if (event.key === "Escape") {
                    return true;
                  }
                  return slashMenuRef.current?.onKeyDown({ event }) ?? false;
                },
                onExit: () => {
                  setSlashMenu(null);
                },
              }),
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

  let slashPortal: ReactNode = null;
  if (slashMenu && slashMenu.items.length > 0) {
    slashPortal = createPortal(
      <div
        className="fixed z-50 pointer-events-auto"
        data-slash-menu
        style={{ left: slashMenu.left, top: slashMenu.top }}
      >
        <SlashMenu
          items={slashMenu.items}
          editor={editor ?? undefined}
          command={slashCommand.current}
          ref={slashMenuRef}
        />
      </div>,
      document.body,
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-end gap-2 bg-background px-4 py-2 text-[13px] text-muted-foreground">
        {saveState === "saving" && (
          <span className="flex items-center gap-1.5 font-medium">
            <Loader2 className="h-4 w-4 animate-spin" /> Saving…
          </span>
        )}
        {saveState === "saved" && (
          <span className="flex items-center gap-1.5 font-medium text-emerald-600">
            <Check className="h-4 w-4" /> Saved
          </span>
        )}
        {saveState === "error" && (
          <button type="button" className="font-medium text-destructive underline" onClick={() => void flush()}>
            Save failed — retry
          </button>
        )}
      </div>
      <div className="editor-flat" onClick={() => editor?.commands.focus()}>
        <EditorContent editor={editor} />
        {editor && (
          <BubbleMenu
            editor={editor}
            className="z-50 flex items-center gap-0.5 rounded-xl border border-border bg-white p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.14)]"
            shouldShow={({ editor: e, state, from, to, view }) => {
              const selection = state.selection;
              const isEmptyTextBlock = !state.doc.textBetween(from, to).length && !(selection instanceof NodeSelection);
              if (!view.hasFocus() || selection.empty || isEmptyTextBlock || !e.isEditable) return false;
              if (selection instanceof NodeSelection) return false;
              return true;
            }}
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
          <BlockStyleMenu editor={editor ?? null} />
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
        {slashPortal}
      </div>
    </div>
  );
}
