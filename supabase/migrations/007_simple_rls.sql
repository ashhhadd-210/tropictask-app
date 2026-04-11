-- ═══════════════════════════════════════════════════════════════
-- CLEAN RESET: Simple RLS policies that actually work
-- Drop everything, start fresh with simple rules
-- ═══════════════════════════════════════════════════════════════

-- ┌─────────────────────────────────────────┐
-- │  1. DROP ALL EXISTING POLICIES          │
-- └─────────────────────────────────────────┘

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop all policies on these tables
  FOR r IN (
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('properties', 'work_orders', 'components', 'profiles', 'payment_requests', 'reviews', 'transactions', 'invite_codes', 'documents', 'wo_stage_history')
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;


-- ┌─────────────────────────────────────────┐
-- │  2. SIMPLE POLICIES                     │
-- └─────────────────────────────────────────┘

-- ══ PROFILES ══
-- Any authenticated user can read profiles (needed for dropdowns, names)
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (id = auth.uid());

-- ══ PROPERTIES ══
-- Any authenticated user can read properties (filtered client-side by role)
CREATE POLICY "properties_select" ON properties FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "properties_insert" ON properties FOR INSERT
  WITH CHECK (manager_id = auth.uid());

CREATE POLICY "properties_update" ON properties FOR UPDATE
  USING (manager_id = auth.uid());

CREATE POLICY "properties_delete" ON properties FOR DELETE
  USING (manager_id = auth.uid());

-- ══ WORK ORDERS ══
-- Any authenticated user can read work orders (filtered client-side by role)
CREATE POLICY "wo_select" ON work_orders FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "wo_insert" ON work_orders FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "wo_update" ON work_orders FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "wo_delete" ON work_orders FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ══ COMPONENTS ══
CREATE POLICY "components_select" ON components FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "components_manage" ON components FOR ALL
  USING (auth.uid() IS NOT NULL);

-- ══ PAYMENT REQUESTS ══
CREATE POLICY "payments_select" ON payment_requests FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "payments_insert" ON payment_requests FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "payments_update" ON payment_requests FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- ══ REVIEWS ══
CREATE POLICY "reviews_select" ON reviews FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "reviews_manage" ON reviews FOR ALL
  USING (auth.uid() IS NOT NULL);

-- ══ TRANSACTIONS ══
CREATE POLICY "transactions_select" ON transactions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ══ INVITE CODES ══
CREATE POLICY "invites_select" ON invite_codes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "invites_insert" ON invite_codes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ══ DOCUMENTS ══
CREATE POLICY "documents_select" ON documents FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "documents_manage" ON documents FOR ALL
  USING (auth.uid() IS NOT NULL);

-- ══ STAGE HISTORY ══
CREATE POLICY "stage_history_select" ON wo_stage_history FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "stage_history_insert" ON wo_stage_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);


-- ┌─────────────────────────────────────────┐
-- │  3. RELOAD                              │
-- └─────────────────────────────────────────┘

NOTIFY pgrst, 'reload schema';
