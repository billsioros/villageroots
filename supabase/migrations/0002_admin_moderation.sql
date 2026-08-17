-- user_roles: admin / contributor classification (admin → moderation bypass)
CREATE TABLE public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'contributor')),
  created_at timestamptz not null default now(),
  unique (user_id)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.user_roles TO authenticated;
CREATE POLICY user_roles_select ON public.user_roles FOR SELECT USING (true);

-- moderations: immutable admin action history (who/when/what/reason)
CREATE TABLE public.moderations (
  id uuid primary key default gen_random_uuid(),
  item_type text not null check (item_type in ('nodes', 'edges', 'scan_uploads')),
  item_id uuid not null,
  action text not null check (action in ('approved', 'rejected')),
  reason text,
  moderated_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);
ALTER TABLE public.moderations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.moderations TO authenticated;
CREATE POLICY moderations_select ON public.moderations FOR SELECT USING (true);
CREATE POLICY moderations_insert ON public.moderations FOR INSERT WITH CHECK (auth.uid() = moderated_by);
CREATE INDEX moderations_item_idx ON public.moderations (item_type, item_id);
CREATE INDEX moderations_moderated_by_idx ON public.moderations (moderated_by);

-- scan_uploads: media queue (living-person uploads land here pending moderation)
CREATE TABLE public.scan_uploads (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  submitter_id uuid not null references auth.users (id),
  storage_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
ALTER TABLE public.scan_uploads ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.scan_uploads TO authenticated;
CREATE POLICY scan_uploads_select ON public.scan_uploads FOR SELECT USING (
  status = 'approved' OR created_by = auth.uid()
);
CREATE POLICY scan_uploads_insert ON public.scan_uploads FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE INDEX scan_uploads_status_idx ON public.scan_uploads (status);

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
