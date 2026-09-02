-- PTDN-26: Self-approval guard via WITH CHECK clauses
-- Without explicit WITH CHECK, PostgreSQL falls back to the USING expression
-- as the new-row check, letting owners change their own row's status to
-- approved/rejected via PostgREST. The prevent_self_approval() trigger in
-- 0003 catches this at the statement level; the WITH CHECK clause enforces
-- it at the RLS level (defense in depth).

-- nodes: owner can update content, but only admins can change status
DROP POLICY nodes_update ON public.nodes;
CREATE POLICY nodes_update ON public.nodes FOR UPDATE
  USING  (auth.uid() = created_by OR public.is_admin(auth.uid()))
  WITH CHECK (
    public.is_admin(auth.uid())
    OR NEW.status IS NOT DISTINCT FROM OLD.status
  );

-- edges: same rule
DROP POLICY edges_update ON public.edges;
CREATE POLICY edges_update ON public.edges FOR UPDATE
  USING  (auth.uid() = created_by OR public.is_admin(auth.uid()))
  WITH CHECK (
    public.is_admin(auth.uid())
    OR NEW.status IS NOT DISTINCT FROM OLD.status
  );
