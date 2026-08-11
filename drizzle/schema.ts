import { sql } from "drizzle-orm";
import {
  pgEnum,
  pgSchema,
  pgTable,
  text,
  uuid,
  jsonb,
  timestamp,
  index,
  check,
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
]);

export const statusEnum = pgEnum("status", ["pending", "approved", "rejected"]);
export const privacyEnum = pgEnum("privacy", ["public", "private"]);

const authSchema = pgSchema("auth");

export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
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
