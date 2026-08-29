"use client";

import { useEffect, useRef } from "react";
import { animate } from "animejs";

const NODE_COLOR = "0 0% 100%";
const ACCENT_COLOR = "351 100% 61%";
const EDGE_COLOR = "0 0% 100%";
const LINK_DIST = 190;
const DRIFT = 16;

interface Node {
  x0: number;
  y0: number;
  x: number;
  y: number;
  r: number;
  phase: number;
  accent: boolean;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function AuthBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rand = mulberry32(0x5eed2026);

    let width = 0;
    let height = 0;
    let nodes: Node[] = [];

    const place = () => {
      const dpr = window.devicePixelRatio || 1;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(36, Math.max(20, Math.round((width * height) / 26000)));
      nodes = Array.from({ length: count }, (_, i) => ({
        x0: rand() * width,
        y0: rand() * height,
        x: rand() * width,
        y: rand() * height,
        r: 1.4 + rand() * 2.2,
        phase: rand() * Math.PI * 2,
        accent: i % 7 === 3,
      }));
    };

    const draw = (dx: number, dy: number, pulse: number) => {
      ctx.clearRect(0, 0, width, height);
      for (const n of nodes) {
        n.x = n.x0 + Math.sin(dx * 0.5 + n.phase) * DRIFT;
        n.y = n.y0 + Math.cos(dy * 0.5 + n.phase) * DRIFT;
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d > LINK_DIST) continue;
          const alpha = (1 - d / LINK_DIST) * 0.22;
          ctx.strokeStyle = `hsla(${EDGE_COLOR} / ${alpha.toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      for (const n of nodes) {
        ctx.fillStyle = `hsl(${n.accent ? ACCENT_COLOR : NODE_COLOR})`;
        ctx.globalAlpha = n.accent ? 0.5 : 0.18 + pulse * 0.14;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + pulse * (n.accent ? 1.4 : 0.9), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    place();
    draw(0, 0, 0);

    if (reduced) {
      const onResize = () => {
        place();
        draw(0, 0, 0.5);
      };
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }

    const state = { dx: 1, dy: 1, pulse: 0 };
    const anim = animate(state, {
      dx: { to: 3.2, duration: 9000 },
      dy: { to: 2.6, duration: 9000 },
      pulse: { to: 1, duration: 5200 },
      ease: "inOutSine",
      loop: true,
      alternate: true,
      onUpdate: () => draw(state.dx, state.dy, state.pulse),
    });

    const onResize = () => {
      place();
      draw(state.dx, state.dy, state.pulse);
    };
    window.addEventListener("resize", onResize);
    return () => {
      anim.cancel();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}