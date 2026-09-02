-- PTDN-26: pgTAP tests for the self-approval guard
-- Run: supabase test db  (requires local Supabase instance with pg_tap extension)

SELECT plan(7);

-- ── Setup ──────────────────────────────────────────────────────────────
-- Create two test users and an admin user
INSERT INTO auth.users (id, email, aud, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 'owner@test.com',  'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'other@test.com',  'authenticated', 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', 'admin@test.com',  'authenticated', 'authenticated');

-- Assign admin role
INSERT INTO public.user_roles (user_id, role) VALUES
  ('33333333-3333-3333-3333-333333333333', 'admin');

-- Seed a pending node owned by the owner
INSERT INTO public.nodes (slug, type, label, status, created_by)
VALUES ('test-node-1', 'person', 'Test Person', 'pending', '11111111-1111-1111-1111-111111111111');

-- Seed a pending edge owned by the owner
INSERT INTO public.nodes (slug, type, label, status, created_by)
VALUES ('test-node-2', 'landmark', 'Test Landmark', 'pending', '11111111-1111-1111-1111-111111111111');
INSERT INTO public.edges (slug, source_id, target_id, type, status, created_by)
SELECT 'test-edge-1', n1.id, n2.id, 'built_by', 'pending', '11111111-1111-1111-1111-111111111111'
FROM public.nodes n1, public.nodes n2
WHERE n1.slug = 'test-node-1' AND n2.slug = 'test-node-2';

-- ── Tests ──────────────────────────────────────────────────────────────

-- 1. Owner cannot self-approve their own node (WITH CHECK blocks status change)
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
SELECT throws_ok(
  'UPDATE public.nodes SET status = ''approved'' WHERE slug = ''test-node-1''',
  23514,  -- check_violation
  null,
  'owner cannot self-approve their own node'
);

-- 2. Owner can update non-status fields on their own node
SELECT lives_ok(
  'UPDATE public.nodes SET label = ''Updated Person'' WHERE slug = ''test-node-1''',
  'owner can update label on own node'
);

-- 3. Owner can update status to the same value (no-op status change)
SELECT lives_ok(
  'UPDATE public.nodes SET status = ''pending'' WHERE slug = ''test-node-1''',
  'owner can set status to same value (no-op)'
);

-- 4. Admin can approve another user's node
SELECT set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333"}', true);
SELECT lives_ok(
  'UPDATE public.nodes SET status = ''approved'' WHERE slug = ''test-node-1''',
  'admin can approve another user''s node'
);

-- 5. Owner cannot change approved → rejected on own node
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
INSERT INTO public.nodes (slug, type, label, status, created_by)
VALUES ('test-node-3', 'person', 'Another Person', 'pending', '11111111-1111-1111-1111-111111111111');
SELECT throws_ok(
  'UPDATE public.nodes SET status = ''approved'' WHERE slug = ''test-node-3''',
  23514,
  null,
  'owner cannot change pending → approved (self-approval guard)'
);

-- 6. Other user cannot modify another user's node (USING blocks it)
SELECT set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);
SELECT throws_ok(
  'UPDATE public.nodes SET status = ''approved'' WHERE slug = ''test-node-1''',
  42501,  -- insufficient_privilege
  null,
  'other user cannot modify another user''s node'
);

-- 7. Same guard applies to edges
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
SELECT throws_ok(
  'UPDATE public.edges SET status = ''approved'' WHERE slug = ''test-edge-1''',
  23514,
  null,
  'owner cannot self-approve their own edge'
);

SELECT * FROM finish();
