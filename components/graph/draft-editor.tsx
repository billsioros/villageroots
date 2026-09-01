"use client";

import { useEffect, useRef, useState } from "react";
import { Save } from "lucide-react";
import { useGraphStore } from "@/store/graphStore";
import { type DraftNode, type RichTextJSON } from "@/lib/graph/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "./rich-text-editor";

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
  const latestDoc = useRef<RichTextJSON | null>(null);

  useEffect(() => {
    setLabel(draft.label);
    setSubtitle(draft.subtitle ?? "");
    setFacts(draft.facts ?? {});
    setDeceased(Boolean(draft.deceased));
  }, [draft.id, draft.label, draft.subtitle, draft.facts, draft.deceased]);

  const save = () => {
    updateDraftNode(draft.id, {
      label: label.trim() || draft.label,
      subtitle: subtitle.trim() || undefined,
      documentContent: latestDoc.current ?? draft.documentContent,
      facts,
      deceased,
    });
    latestDoc.current = null;
    pushToast({ tone: "success", message: "Draft saved" });
  };

  const fields = FACT_FIELDS[draft.type];

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4 pr-12">
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

      <div className="mt-4 text-xs font-medium text-muted-foreground">Story</div>
      <RichTextEditor
        initialContent={draft.documentContent}
        placeholder="Write the story…"
        onSave={async (json) => {
          updateDraftNode(draft.id, { documentContent: json });
          latestDoc.current = json;
        }}
      />

      <Button className="mt-4" onClick={save}>
        <Save className="mr-2 h-4 w-4" /> Save
      </Button>
    </div>
  );
}
