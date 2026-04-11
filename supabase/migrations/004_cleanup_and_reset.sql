-- ═══════════════════════════════════════════════════════════════
-- CLEANUP: Remove SQL-seeded auth users (they don't work properly)
-- After running this, create users via Supabase Dashboard instead
-- ═══════════════════════════════════════════════════════════════

-- Delete seeded data in reverse dependency order
DELETE FROM reviews WHERE id IN ('f1000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000002');
DELETE FROM payment_requests WHERE id IN ('e1000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000002', 'e3000000-0000-0000-0000-000000000003', 'e4000000-0000-0000-0000-000000000004', 'e5000000-0000-0000-0000-000000000005');
DELETE FROM components WHERE id IN ('d1000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000002', 'd3000000-0000-0000-0000-000000000003');
DELETE FROM work_orders WHERE id IN ('c1000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000002', 'c3000000-0000-0000-0000-000000000003', 'c4000000-0000-0000-0000-000000000004', 'c5000000-0000-0000-0000-000000000005', 'c6000000-0000-0000-0000-000000000006', 'c7000000-0000-0000-0000-000000000007', 'c8000000-0000-0000-0000-000000000008');
DELETE FROM properties WHERE id IN ('b1000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000002', 'b3000000-0000-0000-0000-000000000003', 'b4000000-0000-0000-0000-000000000004', 'b5000000-0000-0000-0000-000000000005');

-- Remove profiles (must happen before auth.users due to FK)
DELETE FROM profiles WHERE id IN ('a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002', 'a3000000-0000-0000-0000-000000000003', 'a4000000-0000-0000-0000-000000000004', 'a6000000-0000-0000-0000-000000000006');

-- Remove auth identities
DELETE FROM auth.identities WHERE user_id IN ('a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002', 'a3000000-0000-0000-0000-000000000003', 'a4000000-0000-0000-0000-000000000004', 'a6000000-0000-0000-0000-000000000006');

-- Remove auth users
DELETE FROM auth.users WHERE id IN ('a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002', 'a3000000-0000-0000-0000-000000000003', 'a4000000-0000-0000-0000-000000000004', 'a6000000-0000-0000-0000-000000000006');

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════════
-- DONE. Now create users via Supabase Dashboard:
--
-- Go to Authentication > Users > Add User (top right)
-- Create these 5 users with "Auto Confirm User" checked:
--
--   1. jane@smithpm.com     / pass123
--   2. robert@email.com     / pass123
--   3. mike@plumbing.com    / pass123
--   4. sarah@email.com      / pass123
--   5. coolairco@email.com  / pass123
--
-- After creating all 5, run 005_seed_after_dashboard_users.sql
-- ═══════════════════════════════════════════════════════════════
