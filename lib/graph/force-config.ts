// lib/graph/force-config.ts

export interface ForceConfig {
  // Collision
  collisionBaseRadius: number;
  collisionDegreeScale: number;

  // Charge (repulsion)
  chargeStrength: number;
  chargeDistanceMin: number;
  chargeDistanceMax: number;

  // Link
  linkDistance: number;

  // Simulation
  velocityDecay: number;
  alphaDecay: number;
  cooldownTicks: number;
}

export const DEFAULT_FORCE_CONFIG: ForceConfig = {
  collisionBaseRadius: 50,
  collisionDegreeScale: 12,
  chargeStrength: -800,
  chargeDistanceMin: 30,
  chargeDistanceMax: 600,
  linkDistance: 80,
  velocityDecay: 0.4,
  alphaDecay: 0.02,
  cooldownTicks: 200,
};
