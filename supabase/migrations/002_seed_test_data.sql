-- ═══════════════════════════════════════════════════════════════
-- TropicTask — Seed Test Data
-- Run this in Supabase SQL Editor AFTER 001_initial_schema.sql
-- ═══════════════════════════════════════════════════════════════
-- Creates: 5 test users, 5 properties, 8 work orders,
--          6 payments, 3 components, 2 reviews
--
-- All users have password: pass123
-- ═══════════════════════════════════════════════════════════════


-- ┌─────────────────────────────────────────┐
-- │  0. ENABLE pgcrypto FOR PASSWORD HASH   │
-- └─────────────────────────────────────────┘

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ┌─────────────────────────────────────────┐
-- │  0b. ENSURE user_role ENUM EXISTS       │
-- └─────────────────────────────────────────┘
-- If 001_initial_schema.sql was run, this already exists.
-- Recreate if missing (safe no-op if already present).

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('manager', 'owner', 'contractor', 'tenant');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ┌─────────────────────────────────────────┐
-- │  1. CREATE AUTH USERS                   │
-- └─────────────────────────────────────────┘
-- These go into auth.users so Supabase Auth recognises them.
-- The handle_new_user() trigger auto-creates profile rows.

-- We use fixed UUIDs so we can reference them below.

-- Manager: Jane Smith
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_user_meta_data, raw_app_meta_data,
  aud, role
) VALUES (
  'a1000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'jane@smithpm.com',
  crypt('pass123', gen_salt('bf')),
  now(), now(), now(),
  '{"name": "Jane Smith", "role": "manager"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  'authenticated', 'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Owner: Robert Johnson
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_user_meta_data, raw_app_meta_data,
  aud, role
) VALUES (
  'a2000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'robert@email.com',
  crypt('pass123', gen_salt('bf')),
  now(), now(), now(),
  '{"name": "Robert Johnson", "role": "owner"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  'authenticated', 'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Contractor: Mike Reynolds
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_user_meta_data, raw_app_meta_data,
  aud, role
) VALUES (
  'a3000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'mike@plumbing.com',
  crypt('pass123', gen_salt('bf')),
  now(), now(), now(),
  '{"name": "Mike Reynolds", "role": "contractor"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  'authenticated', 'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Tenant: Sarah Davis
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_user_meta_data, raw_app_meta_data,
  aud, role
) VALUES (
  'a4000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000000',
  'sarah@email.com',
  crypt('pass123', gen_salt('bf')),
  now(), now(), now(),
  '{"name": "Sarah Davis", "role": "tenant"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  'authenticated', 'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Contractor 2: James Cooper (HVAC)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_user_meta_data, raw_app_meta_data,
  aud, role
) VALUES (
  'a6000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000000',
  'coolairco@email.com',
  crypt('pass123', gen_salt('bf')),
  now(), now(), now(),
  '{"name": "James Cooper", "role": "contractor"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  'authenticated', 'authenticated'
) ON CONFLICT (id) DO NOTHING;


-- ┌─────────────────────────────────────────┐
-- │  2. UPDATE PROFILES (enrich auto-created│
-- │     profiles from trigger)              │
-- └─────────────────────────────────────────┘

-- The trigger creates minimal profiles. Now enrich them.

-- Jane Smith — Manager
UPDATE profiles SET
  name = 'Jane Smith',
  phone = '(601) 555-0100',
  roles = ARRAY['manager'::user_role],
  company_name = 'Smith Property Management',
  license_number = 'MS-PM-4421'
WHERE id = 'a1000000-0000-0000-0000-000000000001';

-- Robert Johnson — Owner
UPDATE profiles SET
  name = 'Robert Johnson',
  phone = '(601) 555-0200',
  roles = ARRAY['owner'::user_role],
  manager_id = 'a1000000-0000-0000-0000-000000000001'
WHERE id = 'a2000000-0000-0000-0000-000000000002';

-- Mike Reynolds — Contractor (Plumbing)
UPDATE profiles SET
  name = 'Mike Reynolds',
  phone = '(601) 555-0300',
  roles = ARRAY['contractor'::user_role],
  company_name = 'Mike''s Plumbing LLC',
  license_number = 'MS-PL-887',
  trade = 'Plumbing'
WHERE id = 'a3000000-0000-0000-0000-000000000003';

-- Sarah Davis — Tenant
UPDATE profiles SET
  name = 'Sarah Davis',
  phone = '(601) 555-0400',
  roles = ARRAY['tenant'::user_role],
  manager_id = 'a1000000-0000-0000-0000-000000000001'
WHERE id = 'a4000000-0000-0000-0000-000000000004';

-- James Cooper — Contractor (HVAC)
UPDATE profiles SET
  name = 'James Cooper',
  phone = '(601) 555-0600',
  roles = ARRAY['contractor'::user_role],
  company_name = 'Cool Air Co.',
  license_number = 'MS-HVAC-221',
  trade = 'HVAC'
WHERE id = 'a6000000-0000-0000-0000-000000000006';


-- ┌─────────────────────────────────────────┐
-- │  3. PROPERTIES                          │
-- └─────────────────────────────────────────┘

INSERT INTO properties (id, address, city, state, zip, type, beds, baths, sqft, year_built, monthly_rent, status, manager_id, owner_id, notes)
VALUES
  ('b1000000-0000-0000-0000-000000000001', '142 Oak Street', 'Meridian', 'MS', '39301', 'SFR', 3, 2, 1850, 1998, 1200, 'occupied', 'a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002', 'Gate code: 4421'),
  ('b2000000-0000-0000-0000-000000000002', '88 River Bend Drive', 'Meridian', 'MS', '39301', 'SFR', 4, 3, 2400, 2005, 1650, 'occupied', 'a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002', ''),
  ('b3000000-0000-0000-0000-000000000003', '310 Elmwood Avenue', 'Laurel', 'MS', '39440', 'SFR', 2, 1, 1100, 1985, 850, 'vacant', 'a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002', 'Needs paint before listing'),
  ('b4000000-0000-0000-0000-000000000004', '55 Magnolia Lane', 'Hattiesburg', 'MS', '39401', 'SFR', 3, 2, 1700, 2001, 1100, 'occupied', 'a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002', ''),
  ('b5000000-0000-0000-0000-000000000005', '204 Cypress Court', 'Meridian', 'MS', '39301', 'Condo', 2, 2, 1200, 2012, 1050, 'vacant', 'a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002', '')
ON CONFLICT (id) DO NOTHING;

-- Link Sarah (tenant) to property 2
UPDATE profiles SET property_id = 'b2000000-0000-0000-0000-000000000002'
WHERE id = 'a4000000-0000-0000-0000-000000000004';


-- ┌─────────────────────────────────────────┐
-- │  4. WORK ORDERS                         │
-- └─────────────────────────────────────────┘
-- wo_number is auto-generated by trigger when NULL

INSERT INTO work_orders (id, property_id, category, title, notes, timing, scheduled_date, scheduled_time, stage, priority, submitted_by, contractor_id, created_at)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'hvac', 'HVAC not cooling — unit unlivable', 'AC stopped working completely. Temperature rising to 90+ inside.', 'immediate', NULL, NULL, 2, 'urgent', 'a1000000-0000-0000-0000-000000000001', NULL, now() - interval '5 days'),
  ('c2000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'roofing', 'Roof leak above master bedroom', 'Water dripping from ceiling during rain. Visible water damage on drywall.', 'immediate', NULL, NULL, 1, 'urgent', 'a1000000-0000-0000-0000-000000000001', NULL, now() - interval '6 days'),
  ('c3000000-0000-0000-0000-000000000003', 'b2000000-0000-0000-0000-000000000002', 'plumbing', 'Kitchen faucet leaking under sink', 'Persistent drip under kitchen sink. Bucket catching water.', 'scheduled', (now() + interval '3 days')::date, '11:00 AM', 5, 'high', 'a4000000-0000-0000-0000-000000000004', 'a3000000-0000-0000-0000-000000000003', now() - interval '8 days'),
  ('c4000000-0000-0000-0000-000000000004', 'b4000000-0000-0000-0000-000000000004', 'general', 'Fence panel replacement — backyard', 'Two fence panels damaged in storm.', 'scheduled', NULL, NULL, 1, 'normal', 'a1000000-0000-0000-0000-000000000001', NULL, now() - interval '10 days'),
  ('c5000000-0000-0000-0000-000000000005', 'b2000000-0000-0000-0000-000000000002', 'general', 'Bedroom window won''t latch', 'Window latch broken in master bedroom, security concern.', 'scheduled', NULL, NULL, 3, 'normal', 'a4000000-0000-0000-0000-000000000004', 'a3000000-0000-0000-0000-000000000003', now() - interval '6 days'),
  ('c6000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000001', 'electrical', 'Electrical panel inspection', 'Annual safety inspection due.', 'scheduled', (now() + interval '5 days')::date, '9:00 AM', 5, 'normal', 'a1000000-0000-0000-0000-000000000001', 'a6000000-0000-0000-0000-000000000006', now() - interval '15 days'),
  ('c7000000-0000-0000-0000-000000000007', 'b4000000-0000-0000-0000-000000000004', 'plumbing', 'Water heater assessment', 'Water heater making unusual sounds.', 'immediate', NULL, NULL, 6, 'high', 'a1000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000003', now() - interval '17 days'),
  ('c8000000-0000-0000-0000-000000000008', 'b2000000-0000-0000-0000-000000000002', 'appliances', 'Dishwasher not draining', 'Dishwasher completed cycle but water remains.', 'scheduled', NULL, NULL, 9, 'normal', 'a4000000-0000-0000-0000-000000000004', 'a3000000-0000-0000-0000-000000000003', now() - interval '30 days')
ON CONFLICT (id) DO NOTHING;


-- ┌─────────────────────────────────────────┐
-- │  5. COMPONENTS                          │
-- └─────────────────────────────────────────┘

INSERT INTO components (id, property_id, name, icon, installed, last_serviced, warranty_expiry, warranty_status, notes)
VALUES
  ('d1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'HVAC Unit — Main Floor', '❄️', '2019', 'Jan 2025', '2029', 'ok', 'Trane XR15'),
  ('d2000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'Water Heater — Garage', '🔥', '2021', 'Dec 2024', '2027', 'ok', 'Rheem 50 gal'),
  ('d3000000-0000-0000-0000-000000000003', 'b2000000-0000-0000-0000-000000000002', 'HVAC Unit — Upstairs', '❄️', '2015', 'Nov 2024', '2025', 'soon', 'Carrier Comfort')
ON CONFLICT (id) DO NOTHING;


-- ┌─────────────────────────────────────────┐
-- │  6. PAYMENT REQUESTS                    │
-- └─────────────────────────────────────────┘

INSERT INTO payment_requests (id, created_by, recipient_id, property_id, type, amount, frequency, due_date, note, status)
VALUES
  ('e1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'a4000000-0000-0000-0000-000000000004', 'b2000000-0000-0000-0000-000000000002', 'rent', 1650, 'monthly', (now() - interval '5 days')::date, 'March Rent', 'paid'),
  ('e2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000002', 'maintenance', 350, 'one_time', (now() + interval '3 days')::date, 'Kitchen faucet repair — WO-1037', 'pending'),
  ('e3000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'a4000000-0000-0000-0000-000000000004', 'b2000000-0000-0000-0000-000000000002', 'rent', 1650, 'monthly', (now() + interval '1 day')::date, 'April Rent', 'pending'),
  ('e4000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'management_fee', 480, 'one_time', (now() - interval '20 days')::date, 'Q1 2025 management fee', 'paid'),
  ('e5000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002', 'b3000000-0000-0000-0000-000000000003', 'deposit', 850, 'one_time', (now() - interval '35 days')::date, 'Previous tenant move-out', 'paid')
ON CONFLICT (id) DO NOTHING;


-- ┌─────────────────────────────────────────┐
-- │  7. REVIEWS                             │
-- └─────────────────────────────────────────┘

INSERT INTO reviews (id, contractor_id, manager_id, work_order_id, stars, text, created_at)
VALUES
  ('f1000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'c8000000-0000-0000-0000-000000000008', 5, 'Excellent work. Fixed dishwasher quickly and cleaned up after.', now() - interval '28 days'),
  ('f2000000-0000-0000-0000-000000000002', 'a6000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000001', NULL, 4, 'Good HVAC service. Slightly late but thorough inspection.', now() - interval '60 days')
ON CONFLICT (id) DO NOTHING;


-- ┌─────────────────────────────────────────┐
-- │  8. ADD MISSING DELETE POLICY           │
-- └─────────────────────────────────────────┘
-- The original schema had no DELETE policy for properties.

DO $$ BEGIN
  CREATE POLICY "Managers can delete their properties"
    ON properties FOR DELETE
    USING (manager_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Also add DELETE policy for work orders
DO $$ BEGIN
  CREATE POLICY "Managers can delete WOs on managed properties"
    ON work_orders FOR DELETE
    USING (
      property_id IN (SELECT id FROM properties WHERE manager_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════════
-- SEED DATA COMPLETE
--
-- Test accounts (all password: pass123):
--   jane@smithpm.com    — Manager (Smith Property Management)
--   robert@email.com    — Owner
--   mike@plumbing.com   — Contractor (Plumbing)
--   sarah@email.com     — Tenant (88 River Bend Drive)
--   coolairco@email.com — Contractor (HVAC)
--
-- Data created:
--   5 properties (3 occupied, 2 vacant)
--   8 work orders (stages 1, 2, 3, 5, 6, 9)
--   3 components
--   5 payment requests
--   2 reviews
-- ═══════════════════════════════════════════════════════════════
