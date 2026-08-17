"use client";

import { useEffect, useMemo, useState } from "react";
import { Link2, PencilLine, Plus, Send, Trash2 } from "lucide-react";
import { useGraphStore } from "@/store/graphStore";
import { TYPE_META, VERB_KIND, VERBS, uid } from "@/lib/graph/helpers";
import { type NodeType, type Verb } from "@/lib/graph/types";
import { submissionPayloadFromDrafts } from "@/lib/graph/submissions";
import { queryClient } from "@/lib/graph/query-client";
import { invalidationKeys } from "@/lib/graph/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const NODE_TYPES: NodeType[] = ["person", "family", "landmark", "toponym", "event", "path"];

const VERB_LABELS: Record<Verb, string> = {
  related_to: "is related to",
  born_in: "was born in",
  child_of: "is child of",
  married_to: "is married to",
  sibling_of: "is sibling of",
  belongs_to_clan: "belongs to",
  owns_land_at: "owns land at",
  lived_at: "lived at",
  farmed_at: "farmed at",
  baptized_at: "was baptized at",
  buried_at: "is buried at",
  ran_by: "is run by",
  built_by: "was built by",
  participated_in: "participated in",
  gathered_at: "gathered at",
  attended: "attended",
  fought_in: "fought in",
  migrated_from: "migrated from",
};

export default function ContributePanel() {
  const open = useGraphStore((s) => s.newNodeOpen);
  const setOpen = useGraphStore((s) => s.setNewNodeOpen);
  const draftNodes = useGraphStore((s) => s.draftNodes);
  const draftEdges = useGraphStore((s) => s.draftEdges);
  const addDraftNode = useGraphStore((s) => s.addDraftNode);
  const removeDraftNode = useGraphStore((s) => s.removeDraftNode);
  const addDraftEdge = useGraphStore((s) => s.addDraftEdge);
  const removeDraftEdge = useGraphStore((s) => s.removeDraftEdge);
  const clearDrafts = useGraphStore((s) => s.clearDrafts);
  const selectDraft = useGraphStore((s) => s.selectDraft);
  const clearSelection = useGraphStore((s) => s.clearSelection);
  const canvasCenter = useGraphStore((s) => s.canvasCenter);
  const nodesMap = useGraphStore((s) => s.nodesMap);
  const selectedId = useGraphStore((s) => s.selectedId);
  const pushToast = useGraphStore((s) => s.pushToast);

  const [type, setType] = useState<NodeType>("person");
  const [name, setName] = useState("");
  const [verb, setVerb] = useState<Verb>("related_to");
  const [target, setTarget] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/me/role")
      .then((r) => r.json())
      .then((j: { role: string | null }) => {
        if (active) setIsAdmin(j.role === "admin");
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const source = draftNodes.some((d) => d.id === selectedId) ? selectedId : draftNodes[0]?.id;

  const targetOptions = useMemo(() => {
    const out: { id: string; label: string }[] = [];
    for (const d of draftNodes) if (d.id !== source) out.push({ id: d.id, label: d.label });
    for (const n of Object.values(nodesMap)) if (n.id !== source) out.push({ id: n.id, label: n.label });
    return out;
  }, [draftNodes, nodesMap, source]);

  const labelLookup = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of draftNodes) m.set(d.id, d.label);
    for (const n of Object.values(nodesMap)) m.set(n.id, n.label);
    return m;
  }, [draftNodes, nodesMap]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      clearSelection();
    }
    setOpen(nextOpen);
  };

  const addNode = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      pushToast({ tone: "error", message: "Name is required" });
      return;
    }
    if (adding) return;
    setAdding(true);
    const id = "draft-" + uid();
    addDraftNode({
      id,
      type,
      label: trimmed,
      draft: true,
      x: canvasCenter.x + (Math.random() - 0.5) * 120,
      y: canvasCenter.y + (Math.random() - 0.5) * 120,
    });
    selectDraft(id);
    setName("");
    setAdding(false);
  };

  const addConnection = () => {
    if (!source) {
      pushToast({ tone: "error", message: "Pick a source node" });
      return;
    }
    if (!target) {
      pushToast({ tone: "error", message: "Pick a target node" });
      return;
    }
    if (!targetOptions.some((o) => o.id === target)) {
      setTarget("");
      return;
    }
    if (source === target) {
      pushToast({ tone: "error", message: "Pick two different nodes" });
      return;
    }
    addDraftEdge({ id: "draft-edge-" + uid(), source, target, verb, kind: VERB_KIND[verb], draft: true });
    setTarget("");
  };

  const submit = async () => {
    if (draftNodes.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionPayloadFromDrafts(draftNodes, draftEdges)),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => null)) as { error?: string } | null;
        pushToast({ tone: "error", message: b?.error ?? "Submission failed" });
        return;
      }
      clearDrafts();
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: invalidationKeys.nodes });
      queryClient.invalidateQueries({ queryKey: invalidationKeys.edges });
      pushToast({ tone: "success", message: isAdmin ? "Published" : "Queued for review" });
    } catch {
      pushToast({ tone: "error", message: "Could not reach the server — try again" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[680px] sm:max-w-[680px] max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>Contribute</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 sm:flex-row">
          {/* Left column: Compose */}
          <div className="flex-1 min-w-0 space-y-4">
            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">Add a node</div>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {NODE_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={
                      "rounded-full border px-2.5 py-1 text-xs " +
                      (type === t
                        ? "border-foreground bg-foreground text-background"
                        : "text-muted-foreground hover:bg-muted")
                    }
                  >
                    <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: TYPE_META[t].color }} />
                    {TYPE_META[t].label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Name the node…"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addNode(); }}
                />
                <Button size="sm" onClick={addNode} disabled={adding}>
                  <Plus className="mr-1 h-4 w-4" /> Add
                </Button>
              </div>
            </div>

            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">Add a connection</div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="max-w-[90px] truncate text-sm">{source ? labelLookup.get(source) : "Pick a draft"}</span>
                <select
                  value={verb}
                  onChange={(e) => setVerb(e.target.value as Verb)}
                  className="h-9 rounded-md border bg-card px-2 text-sm"
                >
                  {VERBS.map((v) => (
                    <option key={v} value={v}>{VERB_LABELS[v]}</option>
                  ))}
                </select>
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="h-9 rounded-md border bg-card px-2 text-sm"
                >
                  <option value="">Target…</option>
                  {targetOptions.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
                <Button size="sm" variant="outline" onClick={addConnection} disabled={!source || !target}>
                  <Link2 className="mr-1 h-4 w-4" /> Add
                </Button>
              </div>
            </div>
          </div>

          {/* Right column: Queue */}
          <div className="flex-1 min-w-0">
            <div className="mb-1 text-xs font-medium text-muted-foreground">Queue</div>
            <div className="max-h-[300px] overflow-y-auto rounded-md border p-2">
              {draftNodes.length === 0 && draftEdges.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-muted-foreground">
                  Your queue is empty — add nodes and connections on the left.
                </p>
              ) : (
                <>
                  {draftNodes.map((d) => (
                    <li
                      key={d.id}
                      onClick={() => selectDraft(d.id)}
                      className="flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-sm hover:bg-muted list-none mb-1"
                    >
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{ background: TYPE_META[d.type].color }}
                      >
                        {TYPE_META[d.type].glyph}
                      </span>
                      <span className="flex-1 truncate">{d.label}</span>
                      {!d.description && (!d.facts || Object.keys(d.facts).length === 0) && (
                        <PencilLine className="h-3.5 w-3.5 text-amber-600" aria-label="Needs annotations" />
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); removeDraftNode(d.id); }}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={`Remove ${d.label}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                  {draftEdges.map((e) => (
                    <li
                      key={e.id}
                      className="flex items-center gap-2 rounded-md border px-2 py-1 text-xs text-muted-foreground list-none mb-1"
                    >
                      <span className="flex-1 truncate">
                        {labelLookup.get(e.source) ?? e.source} {VERB_LABELS[e.verb]} {labelLookup.get(e.target) ?? e.target}
                      </span>
                      <button
                        onClick={() => removeDraftEdge(e.id)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Remove connection"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-xs text-muted-foreground">
            {draftNodes.length} nodes · {draftEdges.length} connections
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={clearDrafts}>Clear all</Button>
            <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={submit} disabled={draftNodes.length === 0 || submitting}>
              <Send className="mr-1 h-4 w-4" />
              {submitting ? "Submitting…" : isAdmin ? "Publish" : "Submit for review"}
            </Button>
          </div>
        </div>
        {isAdmin && <p className="text-xs text-muted-foreground">Admin — publishes directly to the graph.</p>}
      </DialogContent>
    </Dialog>
  );
}
