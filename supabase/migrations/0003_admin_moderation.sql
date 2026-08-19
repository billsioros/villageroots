-- Security layer for the moderation tables. The tables themselves (user_roles,
-- moderations, scan_uploads) are created by the drizzle-generated
-- 0001_loving_warhawk.sql migration; this migration only adds RLS, grants,
-- policies, functions and triggers on top of them.

-- user_roles: admin / contributor classification (admin → moderation bypass)
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check CHECK (role IN ('admin', 'contributor'));
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.user_roles TO authenticated;
CREATE POLICY user_roles_select ON public.user_roles FOR SELECT USING (true);

-- moderations: immutable admin action history (who/when/what/reason)
ALTER TABLE public.moderations ADD CONSTRAINT moderations_item_type_check CHECK (item_type IN ('nodes', 'edges', 'scan_uploads'));
ALTER TABLE public.moderations ADD CONSTRAINT moderations_action_check CHECK (action IN ('approved', 'rejected'));
ALTER TABLE public.moderations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.moderations TO authenticated;
CREATE POLICY moderations_select ON public.moderations FOR SELECT USING (true);
CREATE POLICY moderations_insert ON public.moderations FOR INSERT WITH CHECK (auth.uid() = moderated_by);

-- scan_uploads: media queue (living-person uploads land here pending moderation)
ALTER TABLE public.scan_uploads ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.scan_uploads TO authenticated;
CREATE POLICY scan_uploads_select ON public.scan_uploads FOR SELECT USING (
  status = 'approved' OR created_by = auth.uid()
);
CREATE POLICY scan_uploads_insert ON public.scan_uploads FOR INSERT WITH CHECK (auth.uid() = created_by);

-- admin bypass predicate shared by nodes/edges policies
CREATE FUNCTION public.is_admin(uid uuid) RETURNS boolean LANGUAGE sql STABLE AS
$$ SELECT EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = uid AND role = 'admin'
) $$;

-- Add admin bypass to nodes/edges read + update policies (drop + recreate)
DROP POLICY nodes_select ON public.nodes;
CREATE POLICY nodes_select ON public.nodes FOR SELECT USING (
  status = 'approved'
  OR (created_by = auth.uid() AND status <> 'rejected')
  OR public.is_admin(auth.uid())
);
DROP POLICY edges_select ON public.edges;
CREATE POLICY edges_select ON public.edges FOR SELECT USING (
  status = 'approved'
  OR (created_by = auth.uid() AND status <> 'rejected')
  OR public.is_admin(auth.uid())
);
DROP POLICY nodes_update ON public.nodes;
CREATE POLICY nodes_update ON public.nodes FOR UPDATE USING (
  auth.uid() = created_by OR public.is_admin(auth.uid())
);
DROP POLICY edges_update ON public.edges;
CREATE POLICY edges_update ON public.edges FOR UPDATE USING (
  auth.uid() = created_by OR public.is_admin(auth.uid())
);

-- Self-approval guard: non-admins cannot set status to approved/rejected via PostgREST
CREATE FUNCTION public.prevent_self_approval() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT public.is_admin(auth.uid())
     AND NEW.status IN ('approved', 'rejected')
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'only admins may approve or reject rows';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER nodes_prevent_self_approval
  BEFORE UPDATE ON public.nodes
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_approval();
CREATE TRIGGER edges_prevent_self_approval
  BEFORE UPDATE ON public.edges
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_approval();
CREATE TRIGGER scan_uploads_prevent_self_approval
  BEFORE UPDATE ON public.scan_uploads
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_approval();
