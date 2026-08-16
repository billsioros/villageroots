-- RLS as defense-in-depth. The Next.js route handlers connect as the
-- `postgres` superuser (RLS bypassed); the approved/own-pending fetch policy
-- is enforced in Drizzle. RLS protects the data from direct PostgREST access.
-- GRANTs below give anon/authenticated table privileges so the policies run
-- via PostgREST. Follow-up (tracked): a self-approval guard so users cannot
-- set status='approved'/'rejected' on their own rows via PostgREST.
ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edges ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.nodes, public.edges TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nodes, public.edges TO authenticated;

CREATE POLICY nodes_select ON public.nodes FOR SELECT USING (
  status = 'approved' OR (created_by = auth.uid() AND status <> 'rejected')
);
CREATE POLICY edges_select ON public.edges FOR SELECT USING (
  status = 'approved' OR (created_by = auth.uid() AND status <> 'rejected')
);
CREATE POLICY nodes_insert ON public.nodes FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY edges_insert ON public.edges FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY nodes_update ON public.nodes FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY edges_update ON public.edges FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY nodes_delete ON public.nodes FOR DELETE USING (auth.uid() = created_by);
CREATE POLICY edges_delete ON public.edges FOR DELETE USING (auth.uid() = created_by);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER nodes_set_updated_at
  BEFORE UPDATE ON public.nodes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER edges_set_updated_at
  BEFORE UPDATE ON public.edges
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
