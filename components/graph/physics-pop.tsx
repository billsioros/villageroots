"use client";

import { useGraphStore } from "@/store/graphStore";
import { PopoverShell } from "./popover-shell";

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}

function Slider({ label, value, min, max, step, unit, onChange }: SliderProps) {
  return (
    <div className="px-2 py-1.5">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[12px] text-muted-foreground">{label}</span>
        <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
          {value}{unit ?? ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-warm accent-primary"
      />
    </div>
  );
}

export function PhysicsPop() {
  const forceConfig = useGraphStore((s) => s.forceConfig);
  const setForceConfig = useGraphStore((s) => s.setForceConfig);
  const resetForceConfig = useGraphStore((s) => s.resetForceConfig);
  const setPhysicsOpen = useGraphStore((s) => s.setPhysicsOpen);

  return (
    <PopoverShell title="Physics" onClose={() => setPhysicsOpen(false)}>
      <div className="max-h-[70vh] overflow-y-auto p-3">
        {/* Collision */}
        <div className="mb-3">
          <div className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Collision
          </div>
          <Slider
            label="Base radius"
            value={forceConfig.collisionBaseRadius}
            min={50}
            max={200}
            step={5}
            unit="px"
            onChange={(v) => setForceConfig({ collisionBaseRadius: v })}
          />
          <Slider
            label="Per-connection scale"
            value={forceConfig.collisionDegreeScale}
            min={0}
            max={30}
            step={1}
            unit="px"
            onChange={(v) => setForceConfig({ collisionDegreeScale: v })}
          />
        </div>

        {/* Forces */}
        <div className="mb-3">
          <div className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Forces
          </div>
          <Slider
            label="Charge strength"
            value={forceConfig.chargeStrength}
            min={-2000}
            max={-100}
            step={50}
            onChange={(v) => setForceConfig({ chargeStrength: v })}
          />
          <Slider
            label="Link distance"
            value={forceConfig.linkDistance}
            min={80}
            max={500}
            step={10}
            unit="px"
            onChange={(v) => setForceConfig({ linkDistance: v })}
          />
        </div>

        {/* Simulation */}
        <div className="mb-3">
          <div className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Simulation
          </div>
          <Slider
            label="Velocity decay"
            value={forceConfig.velocityDecay}
            min={0.1}
            max={0.9}
            step={0.05}
            onChange={(v) => setForceConfig({ velocityDecay: v })}
          />
          <Slider
            label="Alpha decay"
            value={forceConfig.alphaDecay}
            min={0.005}
            max={0.1}
            step={0.005}
            onChange={(v) => setForceConfig({ alphaDecay: v })}
          />
        </div>

        {/* Reset */}
        <button
          onClick={resetForceConfig}
          className="w-full rounded-full border py-2 text-[12px] font-medium text-muted-foreground hover:bg-surface-warm"
        >
          Reset to defaults
        </button>
      </div>
    </PopoverShell>
  );
}
