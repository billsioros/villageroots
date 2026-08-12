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

export function shouldMaskLivingOnRead(
  row: {
    type: string;
    privacy: "public" | "private";
    properties: Record<string, unknown> | null;
    createdBy: string | null;
  },
  ctx: { uid: string | null; isAdmin: boolean },
): boolean {
  if (row.type !== "person" || row.privacy !== "private") return false;
  if (ctx.isAdmin) return false;
  if (ctx.uid !== null && ctx.uid === row.createdBy) return false;
  return isLivingPerson(row);
}

export function maskPrivateLiving<T extends {
  label: string;
  subtitle: string | null;
  description: string | null;
  properties: Record<string, unknown> | null;
}>(row: T): T {
  return {
    ...row,
    label: LIVING_LABEL,
    subtitle: "",
    description: "",
    properties: {
      x: row.properties?.x ?? 0,
      y: row.properties?.y ?? 0,
    },
  };
}
