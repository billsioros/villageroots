-- PTDN-36: storage lifecycle for orphaned archive-scans.
--
-- Supabase Storage has NO native lifecycle rules, so a daily pg_cron job (via
-- pg_net) POSTs to the `archive-scan-cleanup` Edge Function, which deletes
-- archive-scans objects older than 24h. This migration only provides idempotent
-- helpers; registration is per-environment because the function URL differs:
--
--   Local:
--   select public.vr_archive_scan_cleanup_schedule(
--     'http://127.0.0.1:54321/functions/v1/archive-scan-cleanup',
--     '<local anon key>', '<local CRON_SECRET>'
--   );
--
--   Production (project ref nmordshyhqdfevmavmxc):
--   select public.vr_archive_scan_cleanup_schedule(
--     'https://nmordshyhqdfevmavmxc.supabase.co/functions/v1/archive-scan-cleanup',
--     '<prod anon key>', '<prod CRON_SECRET>'
--   );
--
--   Remove the job: select public.vr_archive_scan_cleanup_unschedule();
--
-- Deploy/secret commands (run once per environment before registering):
--   supabase functions deploy archive-scan-cleanup --no-verify-jwt
--   supabase secrets set CRON_SECRET=<secret>

create extension if not exists pg_net with schema extensions;

create or replace function public.vr_archive_scan_cleanup_schedule(
  function_url text,
  apikey text,
  cleanup_secret text,
  cronexp text default '0 4 * * *'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  job_text text;
begin
  if exists (select 1 from cron.job where jobname = 'vr-archive-scan-cleanup') then
    perform cron.unschedule('vr-archive-scan-cleanup');
  end if;

  job_text := format(
    $job$
    select net.http_post(
      url := %L,
      headers := jsonb_build_object(
        'content-type', 'application/json',
        'apikey', %L,
        'x-cleanup-secret', %L
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    ) as request_id
    $job$,
    function_url,
    apikey,
    cleanup_secret
  );

  perform cron.schedule('vr-archive-scan-cleanup', cronexp, job_text);
end
$$;

create or replace function public.vr_archive_scan_cleanup_unschedule()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from cron.job where jobname = 'vr-archive-scan-cleanup') then
    perform cron.unschedule('vr-archive-scan-cleanup');
  end if;
end
$$;

-- Administrative helpers: never exposed over PostgREST.
revoke execute on function public.vr_archive_scan_cleanup_schedule(text, text, text, text) from public, anon, authenticated;
revoke execute on function public.vr_archive_scan_cleanup_unschedule() from public, anon, authenticated;
grant execute on function public.vr_archive_scan_cleanup_schedule(text, text, text, text) to service_role;
grant execute on function public.vr_archive_scan_cleanup_unschedule() to service_role;
