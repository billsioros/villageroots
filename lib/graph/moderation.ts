import type { Status } from "@/lib/graph/types";

export type ModerationAction = "approve" | "reject";

export function statusForAction(action: ModerationAction): Status {
  return action === "approve" ? "approved" : "rejected";
}

export function applyModeration(
  row: { status: Status },
  action: ModerationAction,
): { status: Status; changed: boolean } {
  const status = statusForAction(action);
  return { status, changed: status !== row.status };
}
