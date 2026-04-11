-- ═══════════════════════════════════════════════════════════════
-- SEED DATA — Run AFTER creating users via Supabase Dashboard
-- This script looks up users by email to get their real UUIDs
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_manager_id  UUID;
  v_owner_id    UUID;
  v_contractor1 UUID;
  v_tenant_id   UUID;
  v_contractor2 UUID;
  v_prop1       UUID;
  v_prop2       UUID;
  v_prop3       UUID;
  v_prop4       UUID;
  v_prop5       UUID;
  v_wo1         UUID;
  v_wo2         UUID;
  v_wo3         UUID;
  v_wo4         UUID;
  v_wo5         UUID;
  v_wo6         UUID;
  v_wo7         UUID;
  v_wo8         UUID;
BEGIN

  -- ┌─────────────────────────────────────────┐
  -- │  1. LOOK UP USER IDs BY EMAIL           │
  -- └─────────────────────────────────────────┘

  SELECT id INTO v_manager_id  FROM auth.users WHERE email = 'jane@smithpm.com';
  SELECT id INTO v_owner_id    FROM auth.users WHERE email = 'robert@email.com';
  SELECT id INTO v_contractor1 FROM auth.users WHERE email = 'mike@plumbing.com';
  SELECT id INTO v_tenant_id   FROM auth.users WHERE email = 'sarah@email.com';
  SELECT id INTO v_contractor2 FROM auth.users WHERE email = 'coolairco@email.com';

  -- Verify all users exist
  IF v_manager_id IS NULL THEN RAISE EXCEPTION 'User jane@smithpm.com not found. Create via Dashboard first.'; END IF;
  IF v_owner_id IS NULL THEN RAISE EXCEPTION 'User robert@email.com not found. Create via Dashboard first.'; END IF;
  IF v_contractor1 IS NULL THEN RAISE EXCEPTION 'User mike@plumbing.com not found. Create via Dashboard first.'; END IF;
  IF v_tenant_id IS NULL THEN RAISE EXCEPTION 'User sarah@email.com not found. Create via Dashboard first.'; END IF;
  IF v_contractor2 IS NULL THEN RAISE EXCEPTION 'User coolairco@email.com not found. Create via Dashboard first.'; END IF;

  RAISE NOTICE 'Found all 5 users. Seeding data...';
  RAISE NOTICE 'Manager: %', v_manager_id;
  RAISE NOTICE 'Owner: %', v_owner_id;
  RAISE NOTICE 'Contractor1: %', v_contractor1;
  RAISE NOTICE 'Tenant: %', v_tenant_id;
  RAISE NOTICE 'Contractor2: %', v_contractor2;

  -- ┌─────────────────────────────────────────┐
  -- │  2. CREATE/UPDATE PROFILES              │
  -- └─────────────────────────────────────────┘
  -- The handle_new_user trigger may not have fired, so INSERT if missing

  INSERT INTO profiles (id, name, email, phone, roles, company_name, license_number, trade, manager_id)
  VALUES
    (v_manager_id,  'Jane Smith',     'jane@smithpm.com',    '(601) 555-0100', ARRAY['manager'::user_role],    'Smith Property Management', 'MS-PM-4421',  NULL,       NULL),
    (v_owner_id,    'Robert Johnson', 'robert@email.com',    '(601) 555-0200', ARRAY['owner'::user_role],      NULL,                        NULL,          NULL,       v_manager_id),
    (v_contractor1, 'Mike Reynolds',  'mike@plumbing.com',   '(601) 555-0300', ARRAY['contractor'::user_role], 'Mike''s Plumbing LLC',      'MS-PL-887',   'Plumbing', NULL),
    (v_tenant_id,   'Sarah Davis',    'sarah@email.com',     '(601) 555-0400', ARRAY['tenant'::user_role],     NULL,                        NULL,          NULL,       v_manager_id),
    (v_contractor2, 'James Cooper',   'coolairco@email.com', '(601) 555-0600', ARRAY['contractor'::user_role], 'Cool Air Co.',              'MS-HVAC-221', 'HVAC',     NULL)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    roles = EXCLUDED.roles,
    company_name = EXCLUDED.company_name,
    license_number = EXCLUDED.license_number,
    trade = EXCLUDED.trade,
    manager_id = EXCLUDED.manager_id;

  -- ┌─────────────────────────────────────────┐
  -- │  3. PROPERTIES                          │
  -- └─────────────────────────────────────────┘

  v_prop1 := uuid_generate_v4();
  v_prop2 := uuid_generate_v4();
  v_prop3 := uuid_generate_v4();
  v_prop4 := uuid_generate_v4();
  v_prop5 := uuid_generate_v4();

  INSERT INTO properties (id, address, city, state, zip, type, beds, baths, sqft, year_built, monthly_rent, status, manager_id, owner_id, notes)
  VALUES
    (v_prop1, '142 Oak Street',      'Meridian',    'MS', '39301', 'SFR',   3, 2, 1850, 1998, 1200, 'occupied', v_manager_id, v_owner_id, 'Gate code: 4421'),
    (v_prop2, '88 River Bend Drive',  'Meridian',    'MS', '39301', 'SFR',   4, 3, 2400, 2005, 1650, 'occupied', v_manager_id, v_owner_id, ''),
    (v_prop3, '310 Elmwood Avenue',   'Laurel',      'MS', '39440', 'SFR',   2, 1, 1100, 1985,  850, 'vacant',   v_manager_id, v_owner_id, 'Needs paint before listing'),
    (v_prop4, '55 Magnolia Lane',     'Hattiesburg', 'MS', '39401', 'SFR',   3, 2, 1700, 2001, 1100, 'occupied', v_manager_id, v_owner_id, ''),
    (v_prop5, '204 Cypress Court',    'Meridian',    'MS', '39301', 'Condo', 2, 2, 1200, 2012, 1050, 'vacant',   v_manager_id, v_owner_id, '');

  -- Link Sarah (tenant) to property 2
  UPDATE profiles SET property_id = v_prop2 WHERE id = v_tenant_id;

  -- ┌─────────────────────────────────────────┐
  -- │  4. WORK ORDERS                         │
  -- └─────────────────────────────────────────┘

  v_wo1 := uuid_generate_v4();
  v_wo2 := uuid_generate_v4();
  v_wo3 := uuid_generate_v4();
  v_wo4 := uuid_generate_v4();
  v_wo5 := uuid_generate_v4();
  v_wo6 := uuid_generate_v4();
  v_wo7 := uuid_generate_v4();
  v_wo8 := uuid_generate_v4();

  INSERT INTO work_orders (id, property_id, category, title, notes, timing, scheduled_date, scheduled_time, stage, priority, submitted_by, contractor_id, created_at)
  VALUES
    (v_wo1, v_prop1, 'hvac',       'HVAC not cooling — unit unlivable',   'AC stopped working completely. Temperature rising to 90+ inside.',         'immediate', NULL, NULL,                                2, 'urgent', v_manager_id, NULL,          now() - interval '5 days'),
    (v_wo2, v_prop1, 'roofing',    'Roof leak above master bedroom',      'Water dripping from ceiling during rain. Visible water damage on drywall.','immediate', NULL, NULL,                                1, 'urgent', v_manager_id, NULL,          now() - interval '6 days'),
    (v_wo3, v_prop2, 'plumbing',   'Kitchen faucet leaking under sink',   'Persistent drip under kitchen sink. Bucket catching water.',               'scheduled', (now() + interval '3 days')::date, '11:00 AM', 5, 'high',   v_tenant_id,  v_contractor1, now() - interval '8 days'),
    (v_wo4, v_prop4, 'general',    'Fence panel replacement — backyard',  'Two fence panels damaged in storm.',                                       'scheduled', NULL, NULL,                                1, 'normal', v_manager_id, NULL,          now() - interval '10 days'),
    (v_wo5, v_prop2, 'general',    'Bedroom window won''t latch',         'Window latch broken in master bedroom, security concern.',                  'scheduled', NULL, NULL,                                3, 'normal', v_tenant_id,  v_contractor1, now() - interval '6 days'),
    (v_wo6, v_prop1, 'electrical', 'Electrical panel inspection',         'Annual safety inspection due.',                                            'scheduled', (now() + interval '5 days')::date, '9:00 AM',  5, 'normal', v_manager_id, v_contractor2, now() - interval '15 days'),
    (v_wo7, v_prop4, 'plumbing',   'Water heater assessment',             'Water heater making unusual sounds.',                                      'immediate', NULL, NULL,                                6, 'high',   v_manager_id, v_contractor1, now() - interval '17 days'),
    (v_wo8, v_prop2, 'appliances', 'Dishwasher not draining',             'Dishwasher completed cycle but water remains.',                            'scheduled', NULL, NULL,                                9, 'normal', v_tenant_id,  v_contractor1, now() - interval '30 days');

  -- ┌─────────────────────────────────────────┐
  -- │  5. COMPONENTS                          │
  -- └─────────────────────────────────────────┘

  INSERT INTO components (property_id, name, icon, installed, last_serviced, warranty_expiry, warranty_status, notes)
  VALUES
    (v_prop1, 'HVAC Unit — Main Floor', '❄️', '2019', 'Jan 2025', '2029', 'ok',   'Trane XR15'),
    (v_prop1, 'Water Heater — Garage',  '🔥', '2021', 'Dec 2024', '2027', 'ok',   'Rheem 50 gal'),
    (v_prop2, 'HVAC Unit — Upstairs',   '❄️', '2015', 'Nov 2024', '2025', 'soon', 'Carrier Comfort');

  -- ┌─────────────────────────────────────────┐
  -- │  6. PAYMENT REQUESTS                    │
  -- └─────────────────────────────────────────┘

  INSERT INTO payment_requests (created_by, recipient_id, property_id, type, amount, frequency, due_date, note, status)
  VALUES
    (v_manager_id, v_tenant_id, v_prop2, 'rent',           1650, 'monthly',  (now() - interval '5 days')::date,  'March Rent',                    'paid'),
    (v_manager_id, v_owner_id,  v_prop2, 'maintenance',     350, 'one_time', (now() + interval '3 days')::date,  'Kitchen faucet repair',         'pending'),
    (v_manager_id, v_tenant_id, v_prop2, 'rent',           1650, 'monthly',  (now() + interval '1 day')::date,   'April Rent',                    'pending'),
    (v_manager_id, v_owner_id,  v_prop1, 'management_fee',  480, 'one_time', (now() - interval '20 days')::date, 'Q1 2025 management fee',        'paid'),
    (v_manager_id, v_owner_id,  v_prop3, 'deposit',         850, 'one_time', (now() - interval '35 days')::date, 'Previous tenant move-out',      'paid');

  -- ┌─────────────────────────────────────────┐
  -- │  7. REVIEWS                             │
  -- └─────────────────────────────────────────┘

  INSERT INTO reviews (contractor_id, manager_id, work_order_id, stars, text, created_at)
  VALUES
    (v_contractor1, v_manager_id, v_wo8, 5, 'Excellent work. Fixed dishwasher quickly and cleaned up after.', now() - interval '28 days'),
    (v_contractor2, v_manager_id, NULL,  4, 'Good HVAC service. Slightly late but thorough inspection.',      now() - interval '60 days');

  RAISE NOTICE 'Seed data complete! Properties: %, Work orders: 8, Payments: 5', 5;

END $$;


-- ┌─────────────────────────────────────────┐
-- │  8. ADD MISSING DELETE POLICIES         │
-- └─────────────────────────────────────────┘

DO $$ BEGIN
  CREATE POLICY "Managers can delete their properties"
    ON properties FOR DELETE
    USING (manager_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Managers can delete WOs on managed properties"
    ON work_orders FOR DELETE
    USING (
      property_id IN (SELECT id FROM properties WHERE manager_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Reload schema
NOTIFY pgrst, 'reload schema';
