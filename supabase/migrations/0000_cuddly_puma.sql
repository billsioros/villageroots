CREATE TYPE "public"."edge_verb" AS ENUM('related_to', 'born_in', 'child_of', 'married_to', 'sibling_of', 'belongs_to_clan', 'owns_land_at', 'lived_at', 'farmed_at', 'baptized_at', 'buried_at', 'ran_by', 'built_by', 'participated_in', 'gathered_at', 'attended', 'fought_in', 'migrated_from');--> statement-breakpoint
CREATE TYPE "public"."node_type" AS ENUM('person', 'family', 'toponym', 'landmark', 'event', 'path');--> statement-breakpoint
CREATE TYPE "public"."privacy" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
-- The real "auth"."users" table already exists (Supabase owns the "auth" schema).
-- Creating it here would fail / replace it, so it is commented out. The guarded
-- FOREIGN KEY statements below (REFERENCES "auth"."users") are kept — they are safe.
-- CREATE TABLE "auth"."users" (
-- 	"id" uuid PRIMARY KEY NOT NULL
-- );
--> statement-breakpoint
CREATE TABLE "edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"source_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"type" "edge_verb" NOT NULL,
	"properties" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "status" DEFAULT 'pending' NOT NULL,
	"created_by" uuid DEFAULT auth.uid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "edges_slug_unique" UNIQUE("slug"),
	CONSTRAINT "edges_no_self_loop" CHECK ("edges"."source_id" <> "edges"."target_id")
);
--> statement-breakpoint
CREATE TABLE "nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"type" "node_type" NOT NULL,
	"label" text NOT NULL,
	"subtitle" text,
	"description" text,
	"properties" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "status" DEFAULT 'pending' NOT NULL,
	"privacy" "privacy" DEFAULT 'public' NOT NULL,
	"created_by" uuid DEFAULT auth.uid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nodes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_source_id_nodes_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_target_id_nodes_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "edges_source_idx" ON "edges" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "edges_target_idx" ON "edges" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "edges_status_idx" ON "edges" USING btree ("status");--> statement-breakpoint
CREATE INDEX "nodes_status_idx" ON "nodes" USING btree ("status");