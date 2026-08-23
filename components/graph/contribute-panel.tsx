"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Link2, Plus, Send, Trash2 } from "lucide-react";
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
  DialogDescription,
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
  const removeDraftEdge = useGraphStore((s) => s.removeDraftEdge);
  const addDraftNode = useGraphStore((s) => s.addDraftNode);
  const removeDraftNode = useGraphStore((s) => s.removeDraftNode);
  const addDraftEdge = useGraphStore((s) => s.addDraftEdge);
  const clearDrafts = useGraphStore((s) => s.clearDrafts);
  const canvasCenter = useGraphStore((s) => s.canvasCenter);
  const nodesMap = useGraphStore((s) => s.nodesMap);
  const pushToast = useGraphStore((s) => s.pushToast);
  const startStep = useGraphStore((s) => s.newNodeStartStep);
  const setNewNodeStartStep = useGraphStore((s) => s.setNewNodeStartStep);

  const [type, setType] = useState<NodeType>("person");
  const [name, setName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<"roster" | "weave">("roster");
  const [connections, setConnections] = useState<
    Record<string, { verb: Verb; target: string }[]>
  >({});
  const [mappingNodeId, setMappingNodeId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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

  const targetOptions = useMemo(() => {
    const out: { id: string; label: string }[] = [];
    for (const d of draftNodes) out.push({ id: d.id, label: d.label });
    for (const n of Object.values(nodesMap)) out.push({ id: n.id, label: n.label });
    return out;
  }, [draftNodes, nodesMap]);

  const labelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of targetOptions) map.set(o.id, o.label);
    return map;
  }, [targetOptions]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setStep("roster");
      setConnections({});
      setMappingNodeId(null);
      setNewNodeStartStep("roster");
    }
  };

  useEffect(() => {
    if (open) setStep(startStep);
  }, [open, startStep]);

  useEffect(() => {
    if (mappingNodeId && !draftNodes.some((d) => d.id === mappingNodeId)) setMappingNodeId(null);
  }, [draftNodes, mappingNodeId]);

  const addNode = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      pushToast({ tone: "error", message: "Name is required" });
      return;
    }
    const id = "draft-" + uid();
    addDraftNode({
      id,
      type,
      label: trimmed,
      draft: true,
      x: canvasCenter.x + (Math.random() - 0.5) * 120,
      y: canvasCenter.y + (Math.random() - 0.5) * 120,
    });
    setName("");
    inputRef.current?.focus();
  };

  const submit = async () => {
    if (draftNodes.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      for (const [nodeId, conns] of Object.entries(connections)) {
        for (const conn of conns) {
          if (!conn.target) continue;
          addDraftEdge({
            id: "draft-edge-" + uid(),
            source: nodeId,
            target: conn.target,
            verb: conn.verb,
            kind: VERB_KIND[conn.verb],
            draft: true,
          });
        }
      }

      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          submissionPayloadFromDrafts(
            draftNodes,
            useGraphStore.getState().draftEdges,
          ),
        ),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => null)) as { error?: string } | null;
        pushToast({ tone: "error", message: b?.error ?? "Submission failed" });
        return;
      }
      clearDrafts();
      setConnections({});
      setMappingNodeId(null);
      setStep("roster");
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

  if (!open) return null;

  const mappedNode = mappingNodeId
    ? draftNodes.find((d) => d.id === mappingNodeId)
    : undefined;
  const mappedImports = mappedNode
    ? draftEdges.filter((e) => e.source === mappedNode.id)
    : [];
  const mappedManual = mappedNode ? connections[mappedNode.id] ?? [] : [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[680px]">
        <DialogHeader>
          <DialogTitle>
            {step === "roster" ? "Add to the map" : "Map connections"}
          </DialogTitle>
          <DialogDescription>
            Step {step === "roster" ? "1 of 2" : "2 of 2"}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Roster */}
        {step === "roster" && (
          <div className="space-y-5">
            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">Category</div>
              <div className="flex flex-wrap gap-2">
                {NODE_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={
                      "rounded-full border px-3 py-1.5 text-xs " +
                      (type === t
                        ? "border-foreground bg-foreground text-background"
                        : "text-muted-foreground hover:bg-muted")
                    }
                  >
                    <span
                      className="mr-1.5 inline-block h-2 w-2 rounded-full"
                      style={{ background: TYPE_META[t].color }}
                    />
                    {TYPE_META[t].label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">Name this entry</div>
              <div className="flex gap-3">
                <Input
                  ref={inputRef}
                  placeholder="Name this entry..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addNode();
                  }}
                />
                <Button size="sm" onClick={addNode}>
                  <Plus className="mr-1 h-4 w-4" /> Add
                </Button>
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">Drafted entries</div>
              <div className="max-h-[40vh] overflow-y-auto rounded-lg border p-3">
                {draftNodes.length === 0 ? (
                  <p className="py-8 text-center text-[13px] text-muted-foreground">
                    Add at least one entry to continue.
                  </p>
                ) : (
                  <ul className="list-none p-0 m-0 space-y-2">
                    {draftNodes.map((d) => (
                      <li
                        key={d.id}
                        className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm"
                      >
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                          style={{ background: TYPE_META[d.type].color }}
                        >
                          {TYPE_META[d.type].glyph}
                        </span>
                        <span className="flex-1 truncate">{d.label}</span>
                        <button
                          onClick={() => setMappingNodeId(d.id)}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label={`Map connections for ${d.label}`}
                        >
                          <Link2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => removeDraftNode(d.id)}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label={`Remove ${d.label}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Weave */}
        {step === "weave" && (
          <div className="space-y-3">
            {draftNodes.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-muted-foreground">
                No entries to connect. Go back to add some.
              </p>
            ) : (
              <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
                {draftNodes.map((d) => {
                  const linkCount =
                    draftEdges.filter((e) => e.source === d.id).length +
                    (connections[d.id] ?? []).filter((c) => c.target).length;
                  return (
                    <div
                      key={d.id}
                      className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm"
                    >
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{ background: TYPE_META[d.type].color }}
                      >
                        {TYPE_META[d.type].glyph}
                      </span>
                      <span className="flex-1 truncate">{d.label}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        {linkCount} {linkCount === 1 ? "link" : "links"}
                      </span>
                      <button
                        onClick={() => setMappingNodeId(d.id)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={`Map connections for ${d.label}`}
                      >
                        <Link2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {draftNodes.length > 0 &&
              Object.values(connections).every((c) => c.length === 0) &&
              draftEdges.length === 0 && (
                <p className="text-center text-[13px] text-muted-foreground">
                  You can submit without connections, or link your entries to existing nodes.
                </p>
              )}
          </div>
        )}

        <div className="flex items-center justify-between border-t pt-4 mt-2">
          <span className="text-xs text-muted-foreground">
            {draftNodes.length} {draftNodes.length === 1 ? "entry" : "entries"} drafted
          </span>
          <div className="flex items-center gap-3">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            {step === "roster" ? (
              <Button
                size="sm"
                onClick={() => setStep("weave")}
                disabled={draftNodes.length === 0}
              >
                Next: Map connections
              </Button>
            ) : (
              <>
                <Button size="sm" variant="ghost" onClick={() => setStep("roster")}>
                  Back
                </Button>
                <Button size="sm" onClick={submit} disabled={submitting}>
                  <Send className="mr-1 h-4 w-4" />
                  {submitting
                    ? "Submitting..."
                    : isAdmin
                      ? `Publish ${draftNodes.length} ${draftNodes.length === 1 ? "entry" : "entries"}`
                      : `Submit ${draftNodes.length} ${draftNodes.length === 1 ? "contribution" : "contributions"}`}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Per-node Map connections dialog */}
        <Dialog
          open={mappingNodeId !== null}
          onOpenChange={(next) => {
            if (!next) setMappingNodeId(null);
          }}
        >
          <DialogContent className="max-w-[560px]">
            {mappedNode && (
              <>
                <DialogHeader>
                  <DialogTitle>Map connections — {mappedNode.label}</DialogTitle>
                  <DialogDescription>
                    Step 2 of 2 · links starting from this entry
                  </DialogDescription>
                </DialogHeader>

                <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                  {mappedImports.map((edge) => {
                    const targetLabel = labelById.get(edge.target) ?? edge.target;
                    return (
                      <div key={edge.id} className="flex items-center gap-2 text-sm flex-wrap">
                        <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium shrink-0">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: TYPE_META[mappedNode.type].color }}
                          />
                          {mappedNode.label}
                        </span>
                        <span className="text-muted-foreground">&rarr;</span>
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                          {VERB_LABELS[edge.verb]}
                        </span>
                        <span className="text-muted-foreground">&rarr;</span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium shrink-0">
                          {targetLabel}
                        </span>
                        <button
                          onClick={() => removeDraftEdge(edge.id)}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label={`Remove link from ${mappedNode.label} to ${targetLabel}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}

                  {mappedManual.map((conn, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm flex-wrap">
                      <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium shrink-0">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: TYPE_META[mappedNode.type].color }}
                        />
                        {mappedNode.label}
                      </span>
                      <span className="text-muted-foreground">&rarr;</span>
                      <select
                        value={conn.verb}
                        onChange={(e) => {
                          const updated = [...mappedManual];
                          updated[idx] = { ...updated[idx], verb: e.target.value as Verb };
                          setConnections((prev) =>
                            prev && mappedNode
                              ? { ...prev, [mappedNode.id]: updated }
                              : prev,
                          );
                        }}
                        className="h-8 rounded-md border bg-card px-2 text-xs"
                      >
                        {VERBS.map((v) => (
                          <option key={v} value={v}>{VERB_LABELS[v]}</option>
                        ))}
                      </select>
                      <span className="text-muted-foreground">&rarr;</span>
                      <select
                        value={conn.target}
                        onChange={(e) => {
                          const updated = [...mappedManual];
                          updated[idx] = { ...updated[idx], target: e.target.value };
                          setConnections((prev) =>
                            prev && mappedNode
                              ? { ...prev, [mappedNode.id]: updated }
                              : prev,
                          );
                        }}
                        className="h-8 rounded-md border bg-card px-2 text-xs"
                      >
                        <option value="">Select target...</option>
                        {targetOptions
                          .filter((o) => o.id !== mappedNode.id)
                          .map((o) => (
                            <option key={o.id} value={o.id}>{o.label}</option>
                          ))}
                      </select>
                      <button
                        onClick={() => {
                          const updated = mappedManual.filter((_, i) => i !== idx);
                          setConnections((prev) =>
                            prev && mappedNode
                              ? { ...prev, [mappedNode.id]: updated }
                              : prev,
                          );
                        }}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Remove connection"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => {
                      if (!mappedNode) return;
                      setConnections((prev) => ({
                        ...(prev ?? {}),
                        [mappedNode.id]: [
                          ...(prev?.[mappedNode.id] ?? []),
                          { verb: "related_to" as Verb, target: "" },
                        ],
                      }));
                    }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Link2 className="h-3 w-3" /> Add another link
                  </button>
                </div>

                <div className="flex justify-end border-t pt-4 mt-2">
                  <Button size="sm" variant="ghost" onClick={() => setMappingNodeId(null)}>
                    Done
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
