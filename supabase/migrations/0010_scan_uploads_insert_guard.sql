-- PTDN-26 follow-up: force scan_uploads INSERTs to land as pending.
-- The existing WITH CHECK only verified created_by = auth.uid(), allowing
-- an admin to INSERT directly with status='approved' and bypass the
-- moderation queue. The prevent_self_approval() trigger in 0003 only
-- fires on UPDATE, not INSERT.

DROP POLICY scan_uploads_insert ON public.scan_uploads;
CREATE POLICY scan_uploads_insert ON public.scan_uploads FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND (status = 'pending' OR status IS NULL)
  );
