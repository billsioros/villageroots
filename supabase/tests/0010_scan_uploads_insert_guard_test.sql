-- pgTAP tests for scan_uploads INSERT self-approval guard (0010)
BEGIN;
SELECT plan(3);

-- Setup: create two users (one contributor, one admin)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, raw_app_meta_data, instance_id, aud, role)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'contributor@example.com', crypt('pass', gen_salt('bf')), now(), now(), now(), '{}', '{}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'admin@example.com', crypt('pass', gen_salt('bf')), now(), now(), now(), '{}', '{}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

INSERT INTO public.user_roles (user_id, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 'contributor'),
  ('22222222-2222-2222-2222-222222222222', 'admin');

-- Test 1: contributor can INSERT with status = 'pending'
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO '11111111-1111-1111-1111-111111111111';
SELECT lives_ok(
  $$INSERT INTO public.scan_uploads (slug, file_url, status, created_by)
    VALUES ('test-pending', 'https://example.com/pending.png', 'pending', '11111111-1111-1111-1111-111111111111')$$,
  'contributor can INSERT with status=pending'
);

-- Test 2: contributor INSERT with status='approved' is blocked
SELECT throws_ok(
  $$INSERT INTO public.scan_uploads (slug, file_url, status, created_by)
    VALUES ('test-approved', 'https://example.com/approved.png', 'approved', '11111111-1111-1111-1111-111111111111')$$,
  42501, null,
  'contributor cannot INSERT with status=approved'
);

-- Test 3: admin INSERT with status='approved' is also blocked (defense in depth)
SET LOCAL request.jwt.claim.sub TO '22222222-2222-2222-2222-222222222222';
SELECT throws_ok(
  $$INSERT INTO public.scan_uploads (slug, file_url, status, created_by)
    VALUES ('test-admin-approved', 'https://example.com/admin.png', 'approved', '22222222-2222-2222-2222-222222222222')$$,
  42501, null,
  'admin cannot INSERT with status=approved (defense in depth)'
);

SELECT * FROM finish();
ROLLBACK;
