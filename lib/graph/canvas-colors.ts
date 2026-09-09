import { tokenColor } from "./helpers";

/**
 * Semantic color roles for canvas selection/highlight painting.
 *
 * Product rule: a chat/citation highlight must be painted with the SAME
 * color as manually selecting a node (the selection token, `--meta`) —
 * never the brand primary. These helpers take no token argument so the
 * policy lives in exactly one place and primary cannot leak in by accident.
 */

const SELECTION_TOKEN = "meta";

/** Ring/halo painted around a manually selected node. */
export const selectStrokeColor = (alpha = 1) => tokenColor(SELECTION_TOKEN, alpha);

/** Alias kept for call-site readability at halo sites. */
export const selectHaloColor = selectStrokeColor;

/** Stroke for nodes highlighted by chat citations / lit paths. */
export const highlightStrokeColor = (alpha = 1) => tokenColor(SELECTION_TOKEN, alpha);

/** Color for edges highlighted by chat citations / lit paths. */
export const highlightEdgeColor = (alpha = 1) => tokenColor(SELECTION_TOKEN, alpha);
