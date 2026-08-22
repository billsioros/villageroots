-- Private bucket for temporary OCR document scans (PTDN-12).
insert into storage.buckets (id, name, public)
values ('archive-scans', 'archive-scans', false)
on conflict (id) do nothing;

-- Users may only touch objects inside their own first-level folder: {auth.uid()}/...
create policy "archive-scans insert own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'archive-scans'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "archive-scans select own folder"
on storage.objects for select to authenticated
using (
  bucket_id = 'archive-scans'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "archive-scans delete own folder"
on storage.objects for delete to authenticated
using (
  bucket_id = 'archive-scans'
  and (storage.foldername(name))[1] = auth.uid()::text
);
