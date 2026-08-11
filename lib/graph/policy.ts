import { and, eq, ne, or, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { Status } from "@/lib/graph/types";

export interface VisibilityRule {
  onlyApproved: boolean;
  ownerId?: string;
}

export function visibilityRule(uid: string | null): VisibilityRule {
  return uid ? { onlyApproved: false, ownerId: uid } : { onlyApproved: true };
}

export function isVisible(
  row: { status: Status; createdBy: string | null },
  uid: string | null,
): boolean {
  if (row.status === "rejected") return false;
  if (row.status === "approved") return true;
  return !!uid && row.createdBy === uid;
}

export function graphPolicy(
  uid: string | null,
  cols: { status: AnyPgColumn; createdBy: AnyPgColumn },
): SQL | undefined {
  const approved = eq(cols.status, "approved");
  const rule = visibilityRule(uid);
  if (rule.onlyApproved) return approved;
  return or(approved, and(eq(cols.createdBy, rule.ownerId!), ne(cols.status, "rejected")));
}
