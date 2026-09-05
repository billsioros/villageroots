-- PTDN-26: Self-approval guard
-- The prevent_self_approval() trigger in 0003 enforces that a row's status can
-- only change through the moderator flow; it fires on UPDATE and aborts
-- self-approval at the statement level.
--
-- NOTE: this migration deliberately uses USING-only policies. An earlier draft
-- added `WITH CHECK (... AND NEW.status IS NOT DISTINCT FROM OLD.status)` as an
-- RLS-level "defense in depth", but PostgreSQL rejects it: the OLD row is not
-- available inside a WITH CHECK clause (only the NEW row is), so comparing the
-- pre- and post-update status in a policy is not expressible in SQL. The
-- trigger in 0003 remains the guard. Without an explicit WITH CHECK,
-- PostgreSQL falls back to the USING expression as the new-row check.

-- nodes: owner can update content; status changes are guarded by the trigger
DROP POLICY nodes_update ON public.nodes;
CREATE POLICY nodes_update ON public.nodes FOR UPDATE
  USING (auth.uid() = created_by OR public.is_admin(auth.uid()));

-- edges: same rule
DROP POLICY edges_update ON public.edges;
CREATE POLICY edges_update ON public.edges FOR UPDATE
  USING (auth.uid() = created_by OR public.is_admin(auth.uid()));
