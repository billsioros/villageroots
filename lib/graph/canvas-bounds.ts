const EDGE_PAN_MARGIN = 90;
const EDGE_PAN_MAX_STEP = 50;

export function getEdgePanDelta(
  point: { x: number; y: number },
  size: { width: number; height: number },
) {
  let x = 0;
  let y = 0;

  if (point.x > size.width - EDGE_PAN_MARGIN) {
    x = Math.min(point.x - (size.width - EDGE_PAN_MARGIN), EDGE_PAN_MAX_STEP);
  } else if (point.x < EDGE_PAN_MARGIN) {
    x = Math.max(point.x - EDGE_PAN_MARGIN, -EDGE_PAN_MAX_STEP);
  }

  if (point.y > size.height - EDGE_PAN_MARGIN) {
    y = Math.min(point.y - (size.height - EDGE_PAN_MARGIN), EDGE_PAN_MAX_STEP);
  } else if (point.y < EDGE_PAN_MARGIN) {
    y = Math.max(point.y - EDGE_PAN_MARGIN, -EDGE_PAN_MAX_STEP);
  }

  return { x, y };
}
