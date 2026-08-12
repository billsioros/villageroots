import { eq, count } from "drizzle-orm";
import type { AnyPgTable } from "drizzle-orm/pg-core";
import { db } from "@/lib/graph/db";
import { nodes, edges, scanUploads, authUsers } from "@/drizzle/schema";
import { maskLivingPerson, isLivingPerson } from "@/lib/graph/policy";

export type ReviewKind = "node" | "edge" | "media";
export interface ReviewItem {
  id: string;
  kind: ReviewKind;
  title: string;
  subtitle: string;
  body: string;
  status: "pending" | "approved" | "rejected";
  submitter: string | null;
  properties: Record<string, unknown>;
}
export interface ReviewPayload {
  items: ReviewItem[];
  counts: Record<string, number>;
}

async function countPending(table: AnyPgTable): Promise<number> {
  const rows = await db.select({ value: count() }).from(table);
  return rows[0]?.value ?? 0;
}

async function counts(): Promise<Record<string, number>> {
  return {
    nodes: await countPending(nodes),
    edges: await countPending(edges),
    scan_uploads: await countPending(scanUploads),
  };
}

type NodeReviewRow = {
  id: string;
  slug: string;
  label: string;
  subtitle: string | null;
  description: string | null;
  status: "pending" | "approved" | "rejected";
  type: "person" | "family" | "toponym" | "landmark" | "event" | "path";
  properties: Record<string, unknown>;
  email: string | null;
};

function nodeToItem(row: NodeReviewRow): ReviewItem {
  if (isLivingPerson(row)) {
    const masked = maskLivingPerson({
      id: row.id,
      slug: row.slug,
      status: row.status,
      label: row.label,
      subtitle: row.subtitle ?? "",
      description: row.description ?? "",
      properties: row.properties,
    });
    return {
      id: masked.id,
      kind: "node",
      title: masked.label,
      subtitle: masked.subtitle,
      body: masked.description,
      status: masked.status,
      submitter: row.email,
      properties: masked.properties,
    };
  }
  return {
    id: row.id,
    kind: "node",
    title: row.label,
    subtitle: row.subtitle ?? "",
    body: row.description ?? "",
    status: row.status,
    submitter: row.email,
    properties: row.properties,
  };
}

export async function fetchNodeReview(): Promise<ReviewPayload> {
  const rows = await db
    .select({
      id: nodes.id,
      slug: nodes.slug,
      type: nodes.type,
      label: nodes.label,
      subtitle: nodes.subtitle,
      description: nodes.description,
      status: nodes.status,
      properties: nodes.properties,
      email: authUsers.email,
    })
    .from(nodes)
    .innerJoin(authUsers, eq(authUsers.id, nodes.createdBy))
    .where(eq(nodes.status, "pending"))
    .orderBy(nodes.createdAt);
  return { items: rows.map(nodeToItem), counts: await counts() };
}

type EdgeReviewRow = {
  id: string;
  slug: string;
  type: string;
  status: "pending" | "approved" | "rejected";
  properties: Record<string, unknown>;
  email: string | null;
};

export async function fetchEdgeReview(): Promise<ReviewPayload> {
  const rows = await db
    .select({
      id: edges.id,
      slug: edges.slug,
      type: edges.type,
      status: edges.status,
      properties: edges.properties,
      email: authUsers.email,
    })
    .from(edges)
    .innerJoin(authUsers, eq(authUsers.id, edges.createdBy))
    .where(eq(edges.status, "pending"))
    .orderBy(edges.createdAt);
  return {
    items: rows.map((row: EdgeReviewRow): ReviewItem => ({
      id: row.id,
      kind: "edge",
      title: String(row.type),
      subtitle: row.slug,
      body: JSON.stringify(row.properties),
      status: row.status,
      submitter: row.email,
      properties: row.properties,
    })),
    counts: await counts(),
  };
}

type MediaReviewRow = {
  id: string;
  slug: string;
  storagePath: string;
  status: "pending" | "approved" | "rejected";
  email: string | null;
};

export async function fetchMediaReview(): Promise<ReviewPayload> {
  const rows = await db
    .select({
      id: scanUploads.id,
      slug: scanUploads.slug,
      storagePath: scanUploads.storagePath,
      status: scanUploads.status,
      email: authUsers.email,
    })
    .from(scanUploads)
    .innerJoin(authUsers, eq(authUsers.id, scanUploads.submitterId))
    .where(eq(scanUploads.status, "pending"))
    .orderBy(scanUploads.createdAt);
  return {
    items: rows.map((row: MediaReviewRow): ReviewItem => ({
      id: row.id,
      kind: "media",
      title: row.slug,
      subtitle: row.storagePath,
      body: "",
      status: row.status,
      submitter: row.email,
      properties: {},
    })),
    counts: await counts(),
  };
}
