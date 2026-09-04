CREATE TABLE "audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_id" uuid NOT NULL REFERENCES auth.users(id),
  "entity_type" text NOT NULL,
  "entity_id" text NOT NULL,
  "entity_slug" text NOT NULL,
  "action" text NOT NULL,
  "status_before" "status",
  "status_after" "status",
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint

CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" ("actor_id");
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" ("entity_type", "entity_id");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" ("created_at");

--> statement-breakpoint

ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;

--> statement-breakpoint

CREATE POLICY "audit_insert_authenticated" ON "audit_logs" FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "audit_select_admin" ON "audit_logs" FOR SELECT USING (public.is_admin(auth.uid()));
