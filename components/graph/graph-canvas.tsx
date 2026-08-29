"use client";

/* eslint-disable @typescript-eslint/no-explicit-any --
   react-force-graph-2d does not export its NodeObject/LinkObject types, so
   callbacks and the imperative graph handle must be loosely typed. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { GraphData } from "react-force-graph-2d";
import { forceCollide, forceManyBody } from "d3-force-3d";
import { useShallow } from "zustand/react/shallow";
import { useGraphStore, selectVisibleNodes } from "@/store/graphStore";
import { clanColor, hexToRgba, tokenColor, TYPE_META } from "@/lib/graph/helpers";
import type { GraphNode } from "@/lib/graph/types";
import {
  buildFamilyForest,
  clanMembers,
  TREE_EDGE_VERBS,
} from "@/lib/graph/tree";

const CULL_THRESHOLD = 200;
const CULL_BUFFER = 200;

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

// Shared pill geometry so the click target always matches the painted node.
function nodePill(node: any, ctx: CanvasRenderingContext2D): { w: number; h: number } {
  const meta = TYPE_META[(node as GraphNode).type];
  ctx.font = `${node.subtitle ? 11 : 13}px Inter, sans-serif`;
  const tw = ctx.measureText(node.label).width;
  const padX = 14;
  const markR = 13;
  return {
    w: tw + padX * 2 + markR * 2 + 15,
    h: meta.pill === "family" ? 26 : 40,
  };
}

export function GraphCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const flyAnimRef = useRef<number | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [graphReady, setGraphReady] = useState(false);

  const nodes = useGraphStore(useShallow(selectVisibleNodes));
  const edges = useGraphStore((s) => s.edges);
  const suggestedEdges = useGraphStore((s) => s.suggestedEdges);
  const draftEdges = useGraphStore((s) => s.draftEdges);
  const selectedId = useGraphStore((s) => s.selectedId);
  const litIds = useGraphStore((s) => s.litIds);
  const litEdgeIds = useGraphStore((s) => s.litEdgeIds);
  const flashIds = useGraphStore((s) => s.flashIds);
  const zoomIntent = useGraphStore((s) => s.zoomIntent);
  const panIntent = useGraphStore((s) => s.panIntent);
  const selectNode = useGraphStore((s) => s.selectNode);
  const clearSelection = useGraphStore((s) => s.clearSelection);
  const setZoomPct = useGraphStore((s) => s.setZoomPct);
  const setZoomIntent = useGraphStore((s) => s.setZoomIntent);
  const setPanIntent = useGraphStore((s) => s.setPanIntent);
  const setCanvasCenter = useGraphStore((s) => s.setCanvasCenter);
  const forceConfig = useGraphStore((s) => s.forceConfig);
  const activeView = useGraphStore((s) => s.activeView);
  const setFocalPersonId = useGraphStore((s) => s.setFocalPersonId);
  const viewportRef = useRef({ x1: -500, y1: -500, x2: 500, y2: 500 });
  const lastViewportUpdate = useRef(0);
  const setViewportBounds = useGraphStore((s) => s.setViewportBounds);
  const viewportBounds = useGraphStore((s) => s.viewportBounds);
  const nodeCount = useGraphStore((s) => Object.keys(s.nodesMap).length);

  const { graphData, degreeMap } = useMemo(() => {
    const visibleIds = new Set(nodes.map((n) => n.id));
    const links: GraphData["links"] = [
      ...edges
        .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
        .map((e) => ({ ...e })),
      ...draftEdges
        .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
        .map((e) => ({ ...e, draft: true })),
      ...suggestedEdges.map((e) => ({ ...e, suggested: true })),
    ];

    // Precompute node degrees for degree-based collision
    const degreeMap = new Map<string, number>();
    for (const link of links) {
      const src = typeof link.source === "object" ? (link.source as GraphNode).id : (link.source as string);
      const tgt = typeof link.target === "object" ? (link.target as GraphNode).id : (link.target as string);
      degreeMap.set(src, (degreeMap.get(src) ?? 0) + 1);
      degreeMap.set(tgt, (degreeMap.get(tgt) ?? 0) + 1);
    }

    return {
      graphData: { nodes, links },
      degreeMap,
    };
  }, [nodes, edges, draftEdges, suggestedEdges]);

  const treeNodes = useMemo(
    () => nodes.filter((n) => n.type === "person" || n.type === "family"),
    [nodes],
  );

  const treeResult = useMemo(() => {
    if (activeView !== "TREE") return null;
    return buildFamilyForest(treeNodes, [...edges, ...draftEdges]);
  }, [activeView, treeNodes, edges, draftEdges]);

  const haloGroups = useMemo(() => {
    if (activeView !== "TREE" || !treeResult) return [];
    const members = clanMembers(treeNodes, [...edges, ...draftEdges]);
    const groups: {
      color: string;
      label: string;
      memberIds: string[];
    }[] = [];
    for (const [familyId, memberIds] of members) {
      const placed = memberIds.filter((id) => treeResult.slots.has(id));
      if (placed.length < 1) continue;
      groups.push({
        color: clanColor(familyId),
        label: treeNodes.find((n) => n.id === familyId)?.label ?? familyId,
        memberIds: placed,
      });
    }
    return groups;
  }, [activeView, treeResult, treeNodes, edges, draftEdges]);

  // Offscreen canvas used only to measure text width (the force-graph canvas
  // ctx is not in scope during render). Created once on mount; safe in this
  // "use client" component.
  const [measureCtx] = useState<CanvasRenderingContext2D | null>(
    () =>
      typeof document === "undefined"
        ? null
        : document.createElement("canvas").getContext("2d"),
  );

  // Precompute the halo box for each clan from slot positions + paintNode's
  // pill geometry. No ref access (the ref's `graphData` getter is not exposed
  // by react-force-graph-2d's useImperativeHandle).
  const haloShapes = useMemo(() => {
    if (activeView !== "TREE" || !measureCtx || !treeResult) return [];
    measureCtx.font = "13px Inter, sans-serif";
    const padX = 14;
    const markR = 13;
    const pillH = 40;
    const out: { color: string; label: string; cx: number; cy: number; r: number }[] = [];
    for (const g of haloGroups) {
      const pts: { x: number; y: number; pillW: number }[] = [];
      for (const id of g.memberIds) {
        const slot = treeResult.slots.get(id);
        if (!slot) continue;
        const label = treeNodes.find((n) => n.id === id)?.label ?? id;
        const tw = measureCtx.measureText(label).width;
        const pillW = tw + padX * 2 + markR * 2 + 15;
        pts.push({ x: slot.x, y: slot.y, pillW });
      }
      if (pts.length < 1) continue;
      const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
      const cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
      let r = 0;
      for (const p of pts) {
        const corners: [number, number][] = [
          [p.x - p.pillW / 2, p.y - pillH / 2],
          [p.x + p.pillW / 2, p.y - pillH / 2],
          [p.x - p.pillW / 2, p.y + pillH / 2],
          [p.x + p.pillW / 2, p.y + pillH / 2],
        ];
        for (const [px, py] of corners) {
          const d = Math.hypot(px - cx, py - cy);
          if (d > r) r = d;
        }
      }
      out.push({ color: g.color, label: g.label, cx, cy, r });
    }
    return out;
  }, [activeView, haloGroups, treeResult, treeNodes, measureCtx]);

  const displayData = useMemo(() => {
    if (activeView !== "TREE") return graphData;
    // TREE mode: only render person nodes — the halo title carries the
    // family name, so the family pill is redundant. Edges are restricted
    // to family verbs between two rendered persons.
    const personIds = new Set(
      nodes.filter((n) => n.type === "person").map((n) => n.id),
    );
    const isPersonEdge = (e: { source: string; target: string; verb: string }) =>
      TREE_EDGE_VERBS.includes(e.verb as any) &&
      personIds.has(e.source) &&
      personIds.has(e.target);
    const personEdges: GraphData["links"] = [
      ...edges.filter(isPersonEdge).map((e) => ({ ...e })),
      ...draftEdges.filter(isPersonEdge).map((e) => ({ ...e, draft: true })),
    ];
    return {
      nodes: nodes.filter((n) => n.type === "person"),
      links: personEdges,
    };
  }, [activeView, nodes, edges, draftEdges]);

  const culledData = useMemo(() => {
    const source = displayData;
    const count = activeView === "TREE" ? source.nodes.length : nodeCount;
    if (count < CULL_THRESHOLD) return source as unknown as GraphData;
    const { x1, y1, x2, y2 } = viewportBounds;
    const visible = new Set(
      source.nodes
        .filter(
          (n) =>
            (n.x ?? 0) >= x1 - CULL_BUFFER &&
            (n.x ?? 0) <= x2 + CULL_BUFFER &&
            (n.y ?? 0) >= y1 - CULL_BUFFER &&
            (n.y ?? 0) <= y2 + CULL_BUFFER,
        )
        .map((n) => n.id),
    );
    return {
      nodes: source.nodes.filter((n) => visible.has(n.id)),
      links: source.links.filter(
        (l) =>
          visible.has(
            typeof l.source === "object"
              ? (l.source as GraphNode).id
              : String(l.source ?? ""),
          ) &&
          visible.has(
            typeof l.target === "object"
              ? (l.target as GraphNode).id
              : String(l.target ?? ""),
          ),
      ),
    };
  }, [activeView, displayData, graphData, viewportBounds, nodeCount]);

  const focusNode = useMemo(
    () => nodes.find((n) => n.id === selectedId),
    [nodes, selectedId],
  );

  // --- resize ---
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // --- zoom intent (StageUi +/- / fit) ---
  useEffect(() => {
    const fg = graphRef.current;
    if (!fg || !zoomIntent) return;
    const k = fg.zoom();
    if (zoomIntent === "in") fg.zoom(Math.min(k * 1.12, 2.6), 300);
    if (zoomIntent === "out") fg.zoom(Math.max(k / 1.12, 0.25), 300);
    if (zoomIntent === "fit") {
      if (focusNode) fg.centerAt(focusNode.x, focusNode.y, 300);
      fg.zoom(1.4, 400);
    }
    setZoomIntent(null);
  }, [zoomIntent, focusNode, setZoomIntent]);

  // --- pan intent (chat path highlight) ---
  useEffect(() => {
    const fg = graphRef.current;
    if (!fg || !panIntent) return;
    const t = panIntent.nodeId;
    const n = nodes.find((n) => n.id === t);
    if (n) {
      fg.centerAt(n.x ?? 0, n.y ?? 0, 500);
      fg.zoom(1.4, 500);
    }
    setPanIntent(null);
  }, [panIntent, setPanIntent, nodes]);

  // --- custom forces, engine stop, initial fit ---
  useEffect(() => {
    const fg = graphRef.current;
    if (!fg) return;

    // Apply config-driven D3 forces
    fg.d3Force(
      "collision",
      forceCollide((node: any) => {
        const degree = degreeMap.get(node.id) ?? 0;
        return forceConfig.collisionBaseRadius + degree * forceConfig.collisionDegreeScale;
      }),
    );

    const charge = forceManyBody() as any;
    charge.strength(forceConfig.chargeStrength);
    charge.distanceMin(forceConfig.chargeDistanceMin);
    charge.distanceMax(forceConfig.chargeDistanceMax);
    fg.d3Force("charge", charge);

    const link = fg.d3Force("link");
    if (link) link.distance(forceConfig.linkDistance);

    fg.d3ReheatSimulation();

    const t = setTimeout(() => fg.zoomToFit(400, 60), 150);
    return () => clearTimeout(t);
  }, [setCanvasCenter, size.w, forceConfig, degreeMap, graphReady]);

  // --- zoom % rAF poll ---
  useEffect(() => {
    const fg = graphRef.current;
    if (!fg) return;
    let raf = 0;
    const tick = () => {
      setZoomPct(Math.round(fg.zoom() * 100));

      // Track viewport bounds (throttled to 100ms)
      const now = Date.now();
      if (now - lastViewportUpdate.current > 100) {
        lastViewportUpdate.current = now;
        const zoom = fg.zoom();
        const cx = fg.center().x;
        const cy = fg.center().y;
        const w = size.w / zoom;
        const h = size.h / zoom;
        const bounds = {
          x1: cx - w / 2,
          y1: cy - h / 2,
          x2: cx + w / 2,
          y2: cy + h / 2,
        };
        viewportRef.current = bounds;
        setViewportBounds(bounds);
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [setZoomPct, size.w, setViewportBounds]);

  // --- smooth camera glide to a node ---
  // Pan and zoom are locked to one shared motion: the clicked node rides a
  // straight screen-space line to the viewport centre while the scale eases in.
  // Deriving the translation from the scaled node position each frame means the
  // camera always ends exactly on the node, even if the simulation nudges it.
  const flyToNode = (node: any) => {
    const fg = graphRef.current;
    if (!fg) return;
    const k0 = fg.zoom();
    const c0 = fg.centerAt();
    const k1 = Math.max(k0, 1.4);
    const nx = node.x ?? 0;
    const ny = node.y ?? 0;
    if (k0 === k1 && Math.abs(c0.x - nx) < 0.5 && Math.abs(c0.y - ny) < 0.5) return;
    const w = size.w;
    const h = size.h;
    const tx0 = w / 2 - c0.x * k0;
    const ty0 = h / 2 - c0.y * k0;
    const nx0 = nx * k0 + tx0; // node's current screen position
    const ny0 = ny * k0 + ty0;
    if (flyAnimRef.current !== null) cancelAnimationFrame(flyAnimRef.current);
    const duration = 850;
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const u = ease(p);
      const k = k0 + (k1 - k0) * u;
      const sx = nx0 + (w / 2 - nx0) * u; // node screen x rides straight to center
      const sy = ny0 + (h / 2 - ny0) * u;
      const tx = sx - (node.x ?? 0) * k;
      const ty = sy - (node.y ?? 0) * k;
      const cx = (w / 2 - tx) / k;
      const cy = (h / 2 - ty) / k;
      fg.centerAt(cx, cy, 0);
      fg.zoom(k, 0);
      if (p < 1) {
        flyAnimRef.current = requestAnimationFrame(step);
      } else {
        flyAnimRef.current = null;
      }
    };
    flyAnimRef.current = requestAnimationFrame(step);
  };

  useEffect(
    () => () => {
      if (flyAnimRef.current !== null) cancelAnimationFrame(flyAnimRef.current);
    },
    [],
  );

  // --- Tree View: glide every node into its slot via fx/fy, then pin ---
  useEffect(() => {
    const fg = graphRef.current;
    if (!fg) return;
    if (activeView !== "TREE" || !treeResult) {
      // Release pins when leaving Tree View
      (nodes as (GraphNode & { fx?: number; fy?: number })[]).forEach((n) => {
        delete n.fx;
        delete n.fy;
      });
      fg.d3ReheatSimulation();
      return;
    }
    const duration = 600;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const from = new Map<string, { x: number; y: number }>();
    const to = new Map<string, { x: number; y: number }>();
    // Pin only the nodes we render in TREE (displayData = persons only).
    const allNodes = (displayData?.nodes ?? nodes) as (GraphNode & {
      fx?: number;
      fy?: number;
    })[];
    for (const n of allNodes) {
      const s = treeResult.slots.get(n.id);
      if (!s) {
        // Non-slot nodes: pin at current position so they don't drift
        n.fx = n.x ?? 0;
        n.fy = n.y ?? 0;
        continue;
      }
      from.set(n.id, { x: n.x ?? 0, y: n.y ?? 0 });
      to.set(n.id, { x: s.x, y: s.y });
    }
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const k = ease(p);
      for (const n of allNodes) {
        const a = from.get(n.id);
        const b = to.get(n.id);
        if (!a || !b) continue;
        n.fx = a.x + (b.x - a.x) * k;
        n.fy = a.y + (b.y - a.y) * k;
      }
      if (p < 1) {
        raf = requestAnimationFrame(step);
      } else {
        // Pin ancestor nodes at final position
        for (const n of allNodes) {
          const b = to.get(n.id);
          if (!b) continue;
          n.fx = b.x;
          n.fy = b.y;
        }
        fg.zoomToFit(500, 80);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [activeView, treeResult, displayData, nodes]);

  const paintClanHalos = useCallback(
    (ctx: CanvasRenderingContext2D, globalScale: number) => {
      const padScreen = 18 / globalScale;
      for (const h of haloShapes) {
        const radius = h.r + padScreen;

        ctx.beginPath();
        ctx.arc(h.cx, h.cy, radius, 0, 2 * Math.PI);
        ctx.fillStyle = hexToRgba(h.color, 0.1);
        ctx.fill();
        ctx.strokeStyle = hexToRgba(h.color, 0.28);
        ctx.lineWidth = 1 / globalScale;
        ctx.stroke();

        ctx.font = `600 ${11 / globalScale}px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillStyle = hexToRgba(h.color, 0.9);
        ctx.fillText(h.label.toUpperCase(), h.cx, h.cy - radius);
      }
    },
    [haloShapes],
  );

  const paintNode = (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const meta = TYPE_META[(node as GraphNode).type];
    const text = node.label;
    const markR = 13;
    const { w: pillW, h: pillH } = nodePill(node, ctx);
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    const lit = litIds.includes(node.id);
    const flash = flashIds.includes(node.id);
    const selected = node.id === selectedId;

    if (flash) {
      ctx.beginPath();
      ctx.arc(x, y, pillW / 2 + 8, 0, 2 * Math.PI);
      ctx.strokeStyle = tokenColor("warn", 0.4);
      ctx.lineWidth = 4 / globalScale;
      ctx.stroke();
    }
    if (lit || selected) {
      ctx.beginPath();
      ctx.arc(x, y, pillW / 2 + (lit ? 6 : 3), 0, 2 * Math.PI);
      ctx.strokeStyle = selected ? tokenColor("meta") : tokenColor("primary");
      ctx.lineWidth = (lit ? 2.5 : 2) / globalScale;
      ctx.stroke();
    }

    const pending = node.draft === true || node.status === "pending";
    const draft = node.draft === true;
    const isClan = meta.pill === "family";
    const clan = isClan ? clanColor(node.id) : null;

    if (pending) {
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = tokenColor("fg", 0.08);
      ctx.strokeStyle = tokenColor("meta");
      ctx.setLineDash([6 / globalScale, 4 / globalScale]);
    } else if (isClan) {
      ctx.fillStyle = clan as string;
      ctx.strokeStyle = selected ? tokenColor("meta") : lit ? tokenColor("primary") : (clan as string);
      ctx.setLineDash([]);
    } else {
      ctx.fillStyle = tokenColor("surface-warm");
      ctx.strokeStyle = selected ? tokenColor("meta") : lit ? tokenColor("primary") : tokenColor("border");
      ctx.setLineDash([]);
    }
    ctx.lineWidth = (selected || lit ? 1.5 : 1) / globalScale;
    ctx.beginPath();
    ctx.roundRect(x - pillW / 2, y - pillH / 2, pillW, pillH, 16 / globalScale);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    const mark = meta.glyph;
    ctx.beginPath();
    ctx.arc(x - pillW / 2 + markR + 4, y, markR, 0, Math.PI * 2);
    ctx.fillStyle = pending
      ? tokenColor("meta", 0.6)
      : isClan
        ? "rgba(255,255,255,0.28)"
        : meta.color;
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "600 12px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(mark, x - pillW / 2 + markR + 4, y + 0.5);

    const labelX = x - pillW / 2 + markR * 2 + 19;
    ctx.textAlign = "left";
    ctx.fillStyle = pending
      ? tokenColor("meta", 0.9)
      : isClan
        ? "rgba(255,255,255,0.95)"
        : tokenColor("fg");
    ctx.font = `600 ${node.subtitle ? 12 : 13}px Inter, sans-serif`;
    ctx.fillText(text, labelX, y - (node.subtitle ? 4 : 0));

    const statusLine = draft
      ? "draft · add annotations"
      : node.status === "pending"
        ? "pending review"
        : (node.subtitle ?? "");
    ctx.fillStyle = isClan
      ? "rgba(255,255,255,0.8)"
      : pending
        ? tokenColor("meta", 0.8)
        : tokenColor("meta");
    ctx.font = "10.5px Inter, sans-serif";
    if (node.subtitle || pending) ctx.fillText(statusLine, labelX, y + 11);

    if (draft) {
      const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 350 + (node.x ?? 0));
      ctx.fillStyle = tokenColor("warn", pulse);
      ctx.font = "11px Inter, sans-serif";
      ctx.fillText("\u270e", x + pillW / 2 - 10, y - pillH / 2 + 12);
    } else if (node.status === "pending") {
      ctx.beginPath();
      ctx.arc(x + pillW / 2 - 8, y - pillH / 2 + 8, 3, 0, Math.PI * 2);
      ctx.fillStyle = tokenColor("warn");
      ctx.fill();
    }
  };

  const getPillH = (node?: { type?: string } | null) =>
    !node || node.type === "family" ? 26 : 40;

  function treeLinkPaint(
    link: unknown,
    ctx: CanvasRenderingContext2D,
    globalScale: number,
  ) {
    const l = link as {
      source: GraphNode | string;
      target: GraphNode | string;
      verb?: string;
    };
    const src =
      typeof l.source === "object" && l.source !== null
        ? (l.source as GraphNode)
        : null;
    const tgt =
      typeof l.target === "object" && l.target !== null
        ? (l.target as GraphNode)
        : null;
    if (!src || !tgt || !l.verb) return;

    ctx.save();
    ctx.beginPath();

    if (l.verb === "married_to") {
      // Smooth connector between the two spouses' bottom edges — a gentle
      // arc below the pills, never a right-angled bar.
      const x1 = src.x;
      const y1 = src.y + getPillH(src) / 2;
      const x2 = tgt.x;
      const y2 = tgt.y + getPillH(tgt) / 2;
      const midX = (x1 + x2) / 2;
      const dip = Math.min(Math.abs(x2 - x1) * 0.18, 14);
      ctx.strokeStyle = tokenColor("fg", 0.35);
      ctx.lineWidth = 1.2 / globalScale;
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(midX, Math.max(y1, y2) + dip, x2, y2);
    } else if (l.verb === "child_of" || l.verb === "parent_of") {
      const parent = src.y <= tgt.y ? src : tgt;
      const child = src.y <= tgt.y ? tgt : src;
      ctx.strokeStyle = tokenColor("fg", 0.6);
      ctx.lineWidth = 1.5 / globalScale;
      ctx.moveTo(parent.x, parent.y + getPillH(parent) / 2);
      ctx.lineTo(child.x, child.y - getPillH(child) / 2);
    } else {
      ctx.closePath();
      ctx.restore();
      return;
    }

    ctx.stroke();
    ctx.restore();
  }

  return (
    <div ref={containerRef} className="absolute inset-0">
      {size.w > 0 && (
        <ForceGraph2D
          ref={((el: any) => {
            graphRef.current = el;
            if (el && !graphReady) setGraphReady(true);
          }) as any}
          graphData={culledData}
          width={size.w}
          height={size.h}
          backgroundColor="transparent"
          autoPauseRedraw={false}
          onRenderFramePre={activeView === "TREE" ? paintClanHalos : undefined}
          nodeCanvasObject={(node: any, ctx, globalScale) => paintNode(node, ctx, globalScale)}
          nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const { w, h } = nodePill(node, ctx);
            const x = node.x ?? 0;
            const y = node.y ?? 0;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.roundRect(x - w / 2, y - h / 2, w, h, 16 / globalScale);
            ctx.fill();
          }}
          linkColor={(l: any) => {
            if (activeView === "TREE") return "rgba(0,0,0,0)";
            if (litEdgeIds.includes(l.id)) return tokenColor("primary");
            if (l.draft) return tokenColor("meta", 0.8);
            if (l.suggested) return tokenColor("primary", 0.8);
            if (l.kind === "geo") return tokenColor("success", 0.55);
            if (l.kind === "hist") return tokenColor("warn", 0.55);
            return tokenColor("fg", 0.45);
          }}
          linkWidth={(l: any) => (l.suggested ? 1.4 : litEdgeIds.includes(l.id) ? 2.4 : 1.2)}
          linkLineDash={(l: any) => (l.suggested || l.draft ? ([5, 4] as any) : null)}
          linkDirectionalParticles={(l: any) => (litEdgeIds.includes(l.id) ? 2 : 0)}
          linkDirectionalParticleSpeed={0.008}
          linkCanvasObject={activeView === "TREE" ? treeLinkPaint : undefined}
          onNodeClick={(node: any) => {
            selectNode(node.id);
            setCanvasCenter({ x: node.x ?? 0, y: node.y ?? 0 });
            flyToNode(node);
            if (activeView === "TREE" && node.type === "person")
              setFocalPersonId(node.id);
          }}
          onBackgroundClick={clearSelection}
          onNodeDragEnd={() => {}}
          onEngineStop={() => {
            const bbox = graphRef.current?.getGraphBbox(() => true);
            if (!bbox) return;
            setCanvasCenter({
              x: bbox.x + bbox.w / 2,
              y: bbox.y + bbox.h / 2,
            });
          }}
          nodeVal={15}
          nodeRelSize={4}
          cooldownTicks={forceConfig.cooldownTicks}
          d3AlphaDecay={forceConfig.alphaDecay}
          d3VelocityDecay={forceConfig.velocityDecay}
        />
      )}
    </div>
  );
}