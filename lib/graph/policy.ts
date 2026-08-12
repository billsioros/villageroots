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

export function derivePrivacy(deceased: boolean): "public" | "private" {
  return deceased ? "public" : "private";
}

export function isLivingPerson(row: {
  type: string;
  properties: Record<string, unknown> | null;
}): boolean {
  if (row.type !== "person") return false;
  const deceased = row.properties?.deceased;
  return !(deceased === true || deceased === "true");
}

const LIVING_LABEL = "Living Person";

export interface LivingMaskOutput {
  id: string;
  slug: string;
  status: "pending" | "approved" | "rejected";
  label: string;
  subtitle: string;
  description: string;
  properties: Record<string, unknown>;
}

export function maskLivingPerson(
  row: {
    id: string;
    slug: string;
    status: "pending" | "approved" | "rejected";
    label: string;
    subtitle: string;
    description: string;
    properties: Record<string, unknown> | null;
  },
): LivingMaskOutput {
  return {
    id: row.id,
    slug: row.slug,
    status: row.status,
    label: LIVING_LABEL,
    subtitle: "",
    description: "",
    properties: {
      x: row.properties?.x ?? 0,
      y: row.properties?.y ?? 0,
    },
  };
}
