CREATE TABLE "moderations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_type" text NOT NULL,
	"item_id" uuid NOT NULL,
	"action" text NOT NULL,
	"reason" text,
	"moderated_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scan_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"submitter_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"status" "status" DEFAULT 'pending' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scan_uploads_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- The real "auth"."users" table already exists (Supabase owns the "auth" schema).
-- The "email" column below is a drizzle mirror for typed joins (lib/admin/review.ts)
-- and already exists in Supabase's auth.users, so this ALTER is intentionally dropped.
-- ALTER TABLE "auth"."users" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "moderations" ADD CONSTRAINT "moderations_moderated_by_users_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_uploads" ADD CONSTRAINT "scan_uploads_submitter_id_users_id_fk" FOREIGN KEY ("submitter_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_uploads" ADD CONSTRAINT "scan_uploads_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "moderations_item_idx" ON "moderations" USING btree ("item_type","item_id");--> statement-breakpoint
CREATE INDEX "moderations_moderated_by_idx" ON "moderations" USING btree ("moderated_by");--> statement-breakpoint
CREATE INDEX "scan_uploads_status_idx" ON "scan_uploads" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "user_roles_user_id_key" ON "user_roles" USING btree ("user_id");