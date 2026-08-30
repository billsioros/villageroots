"use client";

import { useEffect, useRef } from "react";

const NODE_COLOR = "0 0% 14%";
const ACCENT_COLOR = "351 100% 61%";
const EDGE_COLOR = "0 0% 14%";
const LINK_DIST = 250;

interface Node {
  x0: number;
  y0: number;
  x: number;
  y: number;
  ox: number;
  oy: number;
  r: number;
  phase: number;
  amp: number;
  frq: number;
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

    const buildNode = (atLeft: boolean): Node => {
      const y0 = height * (0.5 + (rand() - 0.5) * 0.66);
      const r = 1.5 + rand() * 2.4;
      return {
        x0: atLeft ? rand() * 3 : width - rand() * 3,
        y0,
        x: atLeft ? 0 : width,
        y: y0,
        ox: 0,
        oy: 0,
        r,
        phase: rand() * Math.PI * 2,
        amp: 2 + rand() * 4,
        frq: 0.8 + rand() * 1.6,
        accent: false,
      };
    };

    const place = () => {
      const dpr = window.devicePixelRatio || 1;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const centerBand = (spread = 0.66) =>
        height * (0.5 + (rand() - 0.5) * spread);
      const count = Math.min(64, Math.max(34, Math.round((width * height) / 15000)));
      nodes = Array.from({ length: count }, (_, i) => {
        const r = 1.5 + rand() * 2.4;
        const accent = i % 7 === 3;
        return {
          x0: rand() * width,
          y0: centerBand(),
          x: rand() * width,
          y: centerBand(),
          ox: 0,
          oy: 0,
          r: accent ? r * 2.2 : r,
          phase: rand() * Math.PI * 2,
          amp: 4 + rand() * 6,
          frq: 0.8 + rand() * 1.6,
          accent,
        };
      });
      for (let k = 0; k < 12; k++) {
        nodes.push(buildNode(k % 2 === 0));
      }
    };

    const draw = (t: number, pulse: number) => {
      ctx.clearRect(0, 0, width, height);

      const glow = ctx.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        Math.min(width, height) * 0.5,
      );
      glow.addColorStop(0, `hsla(${ACCENT_COLOR} / 0.09)`);
      glow.addColorStop(1, "hsla(0 0% 0% / 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      const T = t * 0.001;
      for (const n of nodes) {
        const tx = Math.sin(T * n.frq * 0.12 + n.phase) * n.amp * 1.6;
        const ty = Math.cos(T * n.frq * 0.08 + n.phase * 1.7) * n.amp * 1.3;
        n.ox += (tx - n.ox) * 0.02;
        n.oy += (ty - n.oy) * 0.02;
        n.x = n.x0 + n.ox;
        n.y = n.y0 + n.oy;
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d > LINK_DIST) continue;
          const alpha = (1 - d / LINK_DIST) * 0.34;
          ctx.strokeStyle = `hsla(${EDGE_COLOR} / ${alpha.toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      for (const n of nodes) {
        if (n.accent) {
          ctx.fillStyle = `hsla(${ACCENT_COLOR} / 0.13)`;
          ctx.beginPath();
          ctx.arc(n.x, n.y, (n.r + 2) * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = `hsl(${n.accent ? ACCENT_COLOR : NODE_COLOR})`;
        ctx.globalAlpha = n.accent
          ? 0.62 + pulse * 0.12
          : 0.3 + pulse * 0.16;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + pulse * (n.accent ? 1.4 : 0.9), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    place();
    draw(0, 0.5);

    if (reduced) {
      const onResize = () => {
        place();
        draw(0, 0.5);
      };
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }

    let raf = 0;
    const loop = (now: number) => {
      draw(now, (Math.sin(now * 0.0011) + 1) / 2);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onResize = () => {
      place();
      draw(performance.now(), (Math.sin(performance.now() * 0.0011) + 1) / 2);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full blur-[1.5px]"
    />
  );
}