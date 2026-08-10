"use client";

/* eslint-disable @typescript-eslint/no-explicit-any --
   react-force-graph-2d does not export its NodeObject/LinkObject types, so
   callbacks and the imperative graph handle must be loosely typed. */

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { GraphData } from "react-force-graph-2d";
import { useGraphStore } from "@/store/graphStore";
import { tokenColor, TYPE_META } from "@/lib/graph/helpers";
import type { GraphNode } from "@/lib/graph/types";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

export function GraphCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const suggestedEdges = useGraphStore((s) => s.suggestedEdges);
  const hiddenTypes = useGraphStore((s) => s.hiddenTypes);
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

  const { graphData, focusNode } = useMemo(() => {
    const visibleNodes = nodes.filter((n) => !hiddenTypes[n.type]);
    const visibleIds = new Set(visibleNodes.map((n) => n.id));
    const links: GraphData["links"] = [
      ...edges
        .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
        .map((e) => ({ ...e })),
      ...suggestedEdges.map((e) => ({ ...e, suggested: true })),
    ];
    return {
      graphData: { nodes: visibleNodes, links },
      focusNode: visibleNodes.find((n) => n.id === selectedId),
    };
  }, [nodes, edges, suggestedEdges, hiddenTypes, selectedId]);

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
    const n = fg.graphData().nodes.find((n: GraphNode) => n.id === t);
    if (n) {
      fg.centerAt(n.x, n.y, 500);
      fg.zoom(1.4, 500);
    }
    setPanIntent(null);
  }, [panIntent, setPanIntent]);

  // --- engine stop -> record center + initial fit ---
  useEffect(() => {
    const fg = graphRef.current;
    if (!fg) return;
    const onStop = () => {
      const bbox = fg.getGraphBbox(3);
      if (!bbox) return;
      setCanvasCenter({
        x: bbox.x + bbox.w / 2,
        y: bbox.y + bbox.h / 2,
      });
    };
    fg.on("engineStop", onStop);
    const t = setTimeout(() => fg.zoomToFit(400, 60), 150);
    return () => {
      fg.off("engineStop", onStop);
      clearTimeout(t);
    };
  }, [setCanvasCenter]);

  // --- zoom % rAF poll ---
  useEffect(() => {
    const fg = graphRef.current;
    if (!fg) return;
    let raf = 0;
    const tick = () => {
      setZoomPct(Math.round(fg.zoom() * 100));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [setZoomPct]);

  const paintNode = (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const meta = TYPE_META[(node as GraphNode).type];
    const text = node.label;
    ctx.font = `${node.subtitle ? 11 : 13}px Inter, sans-serif`;
    const tw = ctx.measureText(text).width;
    const padX = 14;
    const markR = 13;
    const pillH = meta.pill === "family" ? 26 : 40;
    const pillW = tw + padX * 2 + markR * 2 + 15;
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
      ctx.strokeStyle = tokenColor("primary");
      ctx.lineWidth = (lit ? 2.5 : 2) / globalScale;
      ctx.stroke();
    }

    ctx.fillStyle = tokenColor("surface-warm");
    ctx.strokeStyle = selected || lit ? tokenColor("primary") : tokenColor("border");
    ctx.lineWidth = (selected || lit ? 1.5 : 1) / globalScale;
    ctx.beginPath();
    ctx.roundRect(x - pillW / 2, y - pillH / 2, pillW, pillH, 16 / globalScale);
    ctx.fill();
    ctx.stroke();

    const mark = meta.glyph;
    ctx.beginPath();
    ctx.arc(x - pillW / 2 + markR + 4, y, markR, 0, 2 * Math.PI);
    ctx.fillStyle = meta.color;
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(mark, x - pillW / 2 + markR + 4, y + 0.5);

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = tokenColor("fg");
    ctx.font = `600 ${node.subtitle ? 12 : 13}px Inter, sans-serif`;
    ctx.fillText(text, x - pillW / 2 + markR * 2 + 19, y - (node.subtitle ? 7 : 0));
    if (node.subtitle) {
      ctx.fillStyle = tokenColor("meta");
      ctx.font = "10.5px Inter, sans-serif";
      ctx.fillText(node.subtitle, x - pillW / 2 + markR * 2 + 19, y + 11);
    }
  };

  return (
    <div ref={containerRef} className="absolute inset-0">
      {size.w > 0 && (
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={size.w}
          height={size.h}
          backgroundColor="transparent"
          nodeCanvasObject={(node: any, ctx, globalScale) => paintNode(node, ctx, globalScale)}
          nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x ?? 0, node.y ?? 0, 30, 0, 2 * Math.PI);
            ctx.fill();
          }}
          linkColor={(l: any) => {
            if (litEdgeIds.includes(l.id)) return tokenColor("primary");
            if (l.suggested) return tokenColor("primary", 0.8);
            if (l.kind === "geo") return tokenColor("success", 0.55);
            if (l.kind === "hist") return tokenColor("warn", 0.55);
            return tokenColor("fg", 0.45);
          }}
          linkWidth={(l: any) => (l.suggested ? 1.4 : litEdgeIds.includes(l.id) ? 2.4 : 1.2)}
          linkLineDash={(l: any) => (l.suggested ? ([5, 4] as any) : null)}
          linkDirectionalParticles={(l: any) => (litEdgeIds.includes(l.id) ? 2 : 0)}
          linkDirectionalParticleSpeed={0.008}
          onNodeClick={(node: any) => {
            selectNode(node.id);
            setCanvasCenter({ x: node.x ?? 0, y: node.y ?? 0 });
          }}
          onBackgroundClick={clearSelection}
          cooldownTicks={120}
          d3AlphaDecay={0.05}
        />
      )}
    </div>
  );
}
