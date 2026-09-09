export interface CameraPoint {
  x: number;
  y: number;
  zoom: number;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface CanvasDimensions {
  width: number;
  height: number;
}

export function computeTreeFitCamera(
  bounds: Bounds,
  size: CanvasDimensions,
  fallbackZoom: number,
): CameraPoint {
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  const dx = bounds.maxX - bounds.minX;
  const dy = bounds.maxY - bounds.minY;

  if (dx > 0 && dy > 0 && size.width > 0 && size.height > 0) {
    const fit = Math.min((size.width - 160) / dx, (size.height - 160) / dy);
    return {
      x: cx,
      y: cy,
      zoom: Math.min(fit, 0.9),
    };
  }

  return {
    x: cx,
    y: cy,
    zoom: fallbackZoom,
  };
}

export function computeSubgraphFitCamera(
  nodes: Array<{ id: string; x?: number; y?: number }>,
  focusNodeIds: string[],
  size: CanvasDimensions,
): CameraPoint | null {
  const matching = nodes.filter(
    (n) =>
      focusNodeIds.includes(n.id) &&
      typeof n.x === "number" &&
      !Number.isNaN(n.x) &&
      typeof n.y === "number" &&
      !Number.isNaN(n.y),
  );

  if (matching.length === 0) return null;

  if (matching.length === 1) {
    return {
      x: matching[0].x!,
      y: matching[0].y!,
      zoom: 1.4,
    };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const n of matching) {
    if (n.x! < minX) minX = n.x!;
    if (n.x! > maxX) maxX = n.x!;
    if (n.y! < minY) minY = n.y!;
    if (n.y! > maxY) maxY = n.y!;
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const dx = maxX - minX;
  const dy = maxY - minY;

  if (dx > 0 && dy > 0 && size.width > 0 && size.height > 0) {
    const fit = Math.min((size.width - 120) / dx, (size.height - 120) / dy);
    return {
      x: cx,
      y: cy,
      zoom: Math.min(fit, 1.4),
    };
  }

  return {
    x: cx,
    y: cy,
    zoom: 1.4,
  };
}
