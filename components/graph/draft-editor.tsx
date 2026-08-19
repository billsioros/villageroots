"use client";

import { useEffect, useRef, useState } from "react";
import { Bold, Italic, Link as LinkIcon, List, Save } from "lucide-react";
import { useGraphStore } from "@/store/graphStore";
import { type DraftNode } from "@/lib/graph/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const FACT_FIELDS: Record<DraftNode["type"], { key: string; label: string }[]> = {
  person: [
    { key: "born", label: "Born" },
    { key: "baptized", label: "Baptized" },
    { key: "occupation", label: "Occupation" },
  ],
  family: [
    { key: "root", label: "Root" },
    { key: "home", label: "Home" },
  ],
  event: [
    { key: "year", label: "Year" },
    { key: "where", label: "Where" },
  ],
  path: [
    { key: "from", label: "From" },
    { key: "to", label: "To" },
  ],
  landmark: [{ key: "about", label: "About" }],
  toponym: [{ key: "about", label: "About" }],
};

export default function DraftEditor({ draft }: { draft: DraftNode }) {
  const updateDraftNode = useGraphStore((s) => s.updateDraftNode);
  const pushToast = useGraphStore((s) => s.pushToast);

  const [label, setLabel] = useState(draft.label);
  const [subtitle, setSubtitle] = useState(draft.subtitle ?? "");
  const [facts, setFacts] = useState<Record<string, string>>(draft.facts ?? {});
  const [deceased, setDeceased] = useState(Boolean(draft.deceased));
  const descRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLabel(draft.label);
    setSubtitle(draft.subtitle ?? "");
    setFacts(draft.facts ?? {});
    setDeceased(Boolean(draft.deceased));
    if (descRef.current) descRef.current.textContent = draft.description ?? "";
  }, [draft.id, draft.label, draft.subtitle, draft.description, draft.facts, draft.deceased]);

  const applyMd = (cmd: string) => document.execCommand(cmd);

  const save = () => {
    updateDraftNode(draft.id, {
      label: label.trim() || draft.label,
      subtitle: subtitle.trim() || undefined,
      description: descRef.current?.innerText.trim() || undefined,
      facts,
      deceased,
    });
    pushToast({ tone: "success", message: "Draft saved" });
  };

  const fields = FACT_FIELDS[draft.type];

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <div className="mb-1 text-xs font-medium text-muted-foreground">Label</div>
      <Input value={label} onChange={(e) => setLabel(e.target.value)} />

      <div className="mb-1 mt-3 text-xs font-medium text-muted-foreground">Subtitle</div>
      <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />

      {fields.map((f) => (
        <div key={f.key}>
          <div className="mb-1 mt-3 text-xs font-medium text-muted-foreground">{f.label}</div>
          <Input value={facts[f.key] ?? ""} onChange={(e) => setFacts((prev) => ({ ...prev, [f.key]: e.target.value }))} />
        </div>
      ))}

      {draft.type === "person" && (
        <div className="mt-3 flex items-start gap-2">
          <Checkbox
            id="draft-deceased"
            checked={deceased}
            onCheckedChange={(v) => setDeceased(v === true)}
          />
          <div className="grid gap-1.5">
            <Label htmlFor="draft-deceased">Deceased (public record)</Label>
            <p className="text-xs text-muted-foreground">Living people stay private until death is confirmed.</p>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-1">
        {[
          { cmd: "bold", Icon: Bold, label: "Bold" },
          { cmd: "italic", Icon: Italic, label: "Italic" },
          { cmd: "insertUnorderedList", Icon: List, label: "List" },
          { cmd: "createLink", Icon: LinkIcon, label: "Link" },
        ].map(({ cmd, Icon, label: aria }) => (
          <Button key={cmd} type="button" variant="ghost" size="sm" onClick={() => applyMd(cmd)} aria-label={aria}>
            <Icon className="h-4 w-4" />
          </Button>
        ))}
      </div>
      <div className="mt-2 min-h-[120px] rounded-md border p-3 text-sm" ref={descRef} contentEditable />

      <Button className="mt-4" onClick={save}>
        <Save className="mr-2 h-4 w-4" /> Save
      </Button>
    </div>
  );
}
