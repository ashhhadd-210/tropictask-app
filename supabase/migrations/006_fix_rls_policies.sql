-- ═══════════════════════════════════════════════════════════════
-- FIX: RLS policies that reference other RLS-protected tables
-- The subqueries in policies cause 500 errors due to nested RLS
-- Solution: Use SECURITY DEFINER helper functions to bypass
-- ═══════════════════════════════════════════════════════════════

-- ┌─────────────────────────────────────────┐
-- │  1. HELPER FUNCTIONS (bypass RLS)       │
-- └─────────────────────────────────────────┘

-- Get property IDs managed by a user
CREATE OR REPLACE FUNCTION get_managed_property_ids(uid UUID)
RETURNS SETOF UUID AS $$
  SELECT id FROM properties WHERE manager_id = uid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get property IDs owned by a user
CREATE OR REPLACE FUNCTION get_owned_property_ids(uid UUID)
RETURNS SETOF UUID AS $$
  SELECT id FROM properties WHERE owner_id = uid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get a user's assigned property_id from profiles
CREATE OR REPLACE FUNCTION get_user_property_id(uid UUID)
RETURNS UUID AS $$
  SELECT property_id FROM profiles WHERE id = uid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user is a contractor
DROP FUNCTION IF EXISTS user_has_role(UUID, user_role);
DROP FUNCTION IF EXISTS user_has_role(UUID, text);
CREATE OR REPLACE FUNCTION user_is_contractor(uid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = uid AND 'contractor' = ANY(roles::text[]));
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ┌─────────────────────────────────────────┐
-- │  2. DROP OLD POLICIES                   │
-- └─────────────────────────────────────────┘

-- Properties
DROP POLICY IF EXISTS "Managers see managed properties" ON properties;
DROP POLICY IF EXISTS "Owners see owned properties" ON properties;
DROP POLICY IF EXISTS "Tenants see their property" ON properties;
DROP POLICY IF EXISTS "Managers can create properties" ON properties;
DROP POLICY IF EXISTS "Managers can update their properties" ON properties;
DROP POLICY IF EXISTS "Managers can delete their properties" ON properties;

-- Work Orders
DROP POLICY IF EXISTS "Manager reads WOs on managed properties" ON work_orders;
DROP POLICY IF EXISTS "Owner reads WOs on owned properties" ON work_orders;
DROP POLICY IF EXISTS "Contractor reads assigned WOs" ON work_orders;
DROP POLICY IF EXISTS "Contractor reads unassigned WOs (stage 1-2)" ON work_orders;
DROP POLICY IF EXISTS "Tenant reads WOs on their property" ON work_orders;
DROP POLICY IF EXISTS "Users can create WOs on accessible properties" ON work_orders;
DROP POLICY IF EXISTS "Managers can update WOs" ON work_orders;
DROP POLICY IF EXISTS "Contractors can update assigned WOs" ON work_orders;
DROP POLICY IF EXISTS "Managers can delete WOs on managed properties" ON work_orders;

-- Components
DROP POLICY IF EXISTS "Readable by property-linked users" ON components;
DROP POLICY IF EXISTS "Managers can manage components" ON components;


-- ┌─────────────────────────────────────────┐
-- │  3. RECREATE POLICIES (using helpers)   │
-- └─────────────────────────────────────────┘

-- ══ PROPERTIES ══

CREATE POLICY "Managers see managed properties"
  ON properties FOR SELECT
  USING (manager_id = auth.uid());

CREATE POLICY "Owners see owned properties"
  ON properties FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Tenants see their property"
  ON properties FOR SELECT
  USING (id = get_user_property_id(auth.uid()));

CREATE POLICY "Managers can create properties"
  ON properties FOR INSERT
  WITH CHECK (manager_id = auth.uid());

CREATE POLICY "Managers can update their properties"
  ON properties FOR UPDATE
  USING (manager_id = auth.uid());

CREATE POLICY "Managers can delete their properties"
  ON properties FOR DELETE
  USING (manager_id = auth.uid());


-- ══ WORK ORDERS ══

CREATE POLICY "Manager reads WOs on managed properties"
  ON work_orders FOR SELECT
  USING (property_id IN (SELECT get_managed_property_ids(auth.uid())));

CREATE POLICY "Owner reads WOs on owned properties"
  ON work_orders FOR SELECT
  USING (property_id IN (SELECT get_owned_property_ids(auth.uid())));

CREATE POLICY "Contractor reads assigned WOs"
  ON work_orders FOR SELECT
  USING (contractor_id = auth.uid());

CREATE POLICY "Contractor reads unassigned WOs (stage 1-2)"
  ON work_orders FOR SELECT
  USING (
    contractor_id IS NULL AND stage <= 2 AND
    user_is_contractor(auth.uid())
  );

CREATE POLICY "Tenant reads WOs on their property"
  ON work_orders FOR SELECT
  USING (property_id = get_user_property_id(auth.uid()));

CREATE POLICY "Users can create WOs on accessible properties"
  ON work_orders FOR INSERT
  WITH CHECK (
    property_id IN (SELECT get_managed_property_ids(auth.uid()))
    OR property_id = get_user_property_id(auth.uid())
  );

CREATE POLICY "Managers can update WOs"
  ON work_orders FOR UPDATE
  USING (property_id IN (SELECT get_managed_property_ids(auth.uid())));

CREATE POLICY "Contractors can update assigned WOs"
  ON work_orders FOR UPDATE
  USING (contractor_id = auth.uid());

CREATE POLICY "Managers can delete WOs on managed properties"
  ON work_orders FOR DELETE
  USING (property_id IN (SELECT get_managed_property_ids(auth.uid())));


-- ══ COMPONENTS ══

CREATE POLICY "Readable by property-linked users"
  ON components FOR SELECT
  USING (
    property_id IN (SELECT get_managed_property_ids(auth.uid()))
    OR property_id IN (SELECT get_owned_property_ids(auth.uid()))
    OR property_id = get_user_property_id(auth.uid())
  );

CREATE POLICY "Managers can manage components"
  ON components FOR ALL
  USING (property_id IN (SELECT get_managed_property_ids(auth.uid())));


-- ┌─────────────────────────────────────────┐
-- │  4. RELOAD SCHEMA CACHE                 │
-- └─────────────────────────────────────────┘

NOTIFY pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════════
-- DONE. Properties, work orders, and components should now load.
-- ═══════════════════════════════════════════════════════════════
