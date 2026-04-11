-- ═══════════════════════════════════════════════════════════════
-- FIX: Add auth.identities records for seeded users
-- Supabase requires identity records for email/password login
-- Run this in SQL Editor if sign-in returns "Database error querying schema"
-- ═══════════════════════════════════════════════════════════════

-- Also reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Insert identity records for each seeded user
-- These are required for Supabase Auth to recognize email/password logins

INSERT INTO auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
VALUES
  -- Jane Smith (Manager)
  (
    'a1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    'jane@smithpm.com',
    jsonb_build_object('sub', 'a1000000-0000-0000-0000-000000000001', 'email', 'jane@smithpm.com', 'email_verified', true, 'phone_verified', false),
    'email',
    now(), now(), now()
  ),
  -- Robert Johnson (Owner)
  (
    'a2000000-0000-0000-0000-000000000002',
    'a2000000-0000-0000-0000-000000000002',
    'robert@email.com',
    jsonb_build_object('sub', 'a2000000-0000-0000-0000-000000000002', 'email', 'robert@email.com', 'email_verified', true, 'phone_verified', false),
    'email',
    now(), now(), now()
  ),
  -- Mike Reynolds (Contractor)
  (
    'a3000000-0000-0000-0000-000000000003',
    'a3000000-0000-0000-0000-000000000003',
    'mike@plumbing.com',
    jsonb_build_object('sub', 'a3000000-0000-0000-0000-000000000003', 'email', 'mike@plumbing.com', 'email_verified', true, 'phone_verified', false),
    'email',
    now(), now(), now()
  ),
  -- Sarah Davis (Tenant)
  (
    'a4000000-0000-0000-0000-000000000004',
    'a4000000-0000-0000-0000-000000000004',
    'sarah@email.com',
    jsonb_build_object('sub', 'a4000000-0000-0000-0000-000000000004', 'email', 'sarah@email.com', 'email_verified', true, 'phone_verified', false),
    'email',
    now(), now(), now()
  ),
  -- James Cooper (Contractor 2)
  (
    'a6000000-0000-0000-0000-000000000006',
    'a6000000-0000-0000-0000-000000000006',
    'coolairco@email.com',
    jsonb_build_object('sub', 'a6000000-0000-0000-0000-000000000006', 'email', 'coolairco@email.com', 'email_verified', true, 'phone_verified', false),
    'email',
    now(), now(), now()
  )
ON CONFLICT (provider_id, provider) DO NOTHING;
