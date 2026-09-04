import { sql } from "drizzle-orm";
import {
  pgEnum,
  pgSchema,
  pgTable,
  text,
  uuid,
  boolean,
  jsonb,
  timestamp,
  index,
  check,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const nodeTypeEnum = pgEnum("node_type", [
  "person",
  "family",
  "toponym",
  "landmark",
  "event",
  "path",
]);

export const edgeVerbEnum = pgEnum("edge_verb", [
  "related_to",
  "born_in",
  "child_of",
  "married_to",
  "sibling_of",
  "belongs_to_clan",
  "owns_land_at",
  "lived_at",
  "farmed_at",
  "baptized_at",
  "buried_at",
  "ran_by",
  "built_by",
  "participated_in",
  "gathered_at",
  "attended",
  "fought_in",
  "migrated_from",
  "parent_of",
]);

export const statusEnum = pgEnum("status", ["pending", "approved", "rejected"]);
export const privacyEnum = pgEnum("privacy", ["public", "private"]);

const authSchema = pgSchema("auth");

export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
  email: text("email"),
});

export const nodes = pgTable(
  "nodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    type: nodeTypeEnum("type").notNull(),
    label: text("label").notNull(),
    subtitle: text("subtitle"),
    description: text("description"),
    documentContent: jsonb("document_content").$type<Record<string, unknown> | null>(),
    properties: jsonb("properties")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    status: statusEnum("status").notNull().default("pending"),
    privacy: privacyEnum("privacy").notNull().default("public"),
    // created_by defaults to auth.uid() (RLS context only). Server-side inserts
    // via the direct postgres connection MUST set it explicitly (auth.uid() is
    // NULL without a request JWT → NOT NULL violation).
    createdBy: uuid("created_by")
      .notNull()
      .default(sql`auth.uid()`)
      .references(() => authUsers.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("nodes_status_idx").on(t.status)],
);

export const edges = pgTable(
  "edges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    targetId: uuid("target_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    type: edgeVerbEnum("type").notNull(),
    properties: jsonb("properties")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    status: statusEnum("status").notNull().default("pending"),
    // created_by defaults to auth.uid() (RLS context only). Server-side inserts
    // via the direct postgres connection MUST set it explicitly (auth.uid() is
    // NULL without a request JWT → NOT NULL violation).
    createdBy: uuid("created_by")
      .notNull()
      .default(sql`auth.uid()`)
      .references(() => authUsers.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("edges_source_idx").on(t.sourceId),
    index("edges_target_idx").on(t.targetId),
    index("edges_status_idx").on(t.status),
    check("edges_no_self_loop", sql`${t.sourceId} <> ${t.targetId}`),
  ],
);

export type NodeRow = typeof nodes.$inferSelect;
export type EdgeRow = Omit<typeof edges.$inferSelect, "sourceId" | "targetId"> & {
  sourceId: string;
  targetId: string;
  sourceSlug: string;
  targetSlug: string;
};

export const userRoles = pgTable(
  "user_roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["admin", "contributor"] }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("user_roles_user_id_key").on(t.userId)],
);

export const moderations = pgTable(
  "moderations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemType: text("item_type", { enum: ["nodes", "edges", "scan_uploads"] }).notNull(),
    itemId: uuid("item_id").notNull(),
    action: text("action", { enum: ["approved", "rejected"] }).notNull(),
    reason: text("reason"),
    moderatedBy: uuid("moderated_by")
      .notNull()
      .references(() => authUsers.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("moderations_item_idx").on(t.itemType, t.itemId),
    index("moderations_moderated_by_idx").on(t.moderatedBy),
  ],
);

export const scanUploads = pgTable(
  "scan_uploads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    submitterId: uuid("submitter_id")
      .notNull()
      .references(() => authUsers.id),
    storagePath: text("storage_path").notNull(),
    status: statusEnum("status").notNull().default("pending"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => authUsers.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("scan_uploads_status_idx").on(t.status)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id),
    type: text("type", {
      enum: ["submission_approved", "submission_rejected", "submission_pending"],
    }).notNull(),
    message: text("message").notNull(),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    metadata: jsonb("metadata"),
  },
  (t) => [
    index("notifications_user_idx").on(t.userId),
    index("notifications_read_idx").on(t.userId, t.read),
  ],
);

export type UserRoleRow = typeof userRoles.$inferSelect;
export type ModerationRow = typeof moderations.$inferSelect;
export type ScanUploadRow = typeof scanUploads.$inferSelect;
export type NotificationRow = typeof notifications.$inferSelect;

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => authUsers.id),
    entityType: text("entity_type", { enum: ["node", "edge"] }).notNull(),
    entityId: text("entity_id").notNull(),
    entitySlug: text("entity_slug").notNull(),
    action: text("action", { enum: ["create", "update", "status_change"] }).notNull(),
    statusBefore: statusEnum("status_before"),
    statusAfter: statusEnum("status_after"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("audit_logs_actor_idx").on(t.actorId),
    index("audit_logs_entity_idx").on(t.entityType, t.entityId),
    index("audit_logs_created_at_idx").on(t.createdAt),
  ],
);

export type AuditLogRow = typeof auditLogs.$inferSelect;
