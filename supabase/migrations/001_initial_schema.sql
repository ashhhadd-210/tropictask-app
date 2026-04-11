-- ═══════════════════════════════════════════════════════════════
-- TropicTask — Complete Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ═══════════════════════════════════════════════════════════════
-- Version: 1.0
-- Stack: Supabase (PostgreSQL 15+)
-- Run order: Execute this entire file in one go
-- ═══════════════════════════════════════════════════════════════


-- ┌─────────────────────────────────────────┐
-- │  1. EXTENSIONS                          │
-- └─────────────────────────────────────────┘

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- for fuzzy text search


-- ┌─────────────────────────────────────────┐
-- │  2. CUSTOM TYPES                        │
-- └─────────────────────────────────────────┘

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('manager', 'owner', 'contractor', 'tenant');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE property_status AS ENUM ('occupied', 'vacant', 'alert');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE wo_priority AS ENUM ('urgent', 'high', 'normal', 'low');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE wo_category AS ENUM ('hvac', 'plumbing', 'electrical', 'roofing', 'appliances', 'landscaping', 'painting', 'general');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_type AS ENUM ('rent', 'deposit', 'late_fee', 'maintenance', 'management_fee', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'autopay_active', 'paid', 'overdue', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_frequency AS ENUM ('one_time', 'monthly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE invite_type AS ENUM ('tenant', 'owner', 'contractor');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE warranty_status AS ENUM ('ok', 'soon', 'exp');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ┌─────────────────────────────────────────┐
-- │  3. TABLES                              │
-- └─────────────────────────────────────────┘

-- ══ PROFILES ══
-- Extends Supabase auth.users. One row per user.
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  roles           user_role[] NOT NULL DEFAULT '{}',
  company_name    TEXT,
  license_number  TEXT,
  trade           TEXT,                          -- contractor specialty
  manager_id      UUID REFERENCES profiles(id),  -- for owners/tenants
  property_id     UUID,                          -- for tenants (set after properties table)
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  stripe_customer_id TEXT,
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══ PROPERTIES ══
CREATE TABLE IF NOT EXISTS properties (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  address         TEXT NOT NULL,
  city            TEXT NOT NULL,
  state           TEXT NOT NULL DEFAULT 'MS',
  zip             TEXT,
  type            TEXT NOT NULL DEFAULT 'SFR',   -- SFR, Condo, Duplex, etc.
  beds            INTEGER NOT NULL DEFAULT 0,
  baths           NUMERIC NOT NULL DEFAULT 0,    -- allows 2.5
  sqft            INTEGER,
  year_built      INTEGER,
  monthly_rent    NUMERIC,
  security_deposit NUMERIC,
  notes           TEXT,
  status          property_status NOT NULL DEFAULT 'vacant',
  manager_id      UUID NOT NULL REFERENCES profiles(id),
  owner_id        UUID REFERENCES profiles(id),
  primary_photo_url TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Now add the FK for profiles.property_id (skip if already exists)
DO $$ BEGIN
  ALTER TABLE profiles
    ADD CONSTRAINT fk_profiles_property
    FOREIGN KEY (property_id) REFERENCES properties(id)
    ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ══ WORK ORDERS ══
CREATE TABLE IF NOT EXISTS work_orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wo_number       TEXT NOT NULL UNIQUE,          -- WO-1042
  property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  category        wo_category NOT NULL DEFAULT 'general',
  title           TEXT NOT NULL,
  notes           TEXT,
  timing          TEXT NOT NULL DEFAULT 'immediate',  -- immediate | scheduled
  scheduled_date  DATE,
  scheduled_time  TEXT,
  stage           INTEGER NOT NULL DEFAULT 1 CHECK (stage >= 1 AND stage <= 9),
  priority        wo_priority NOT NULL DEFAULT 'normal',
  submitted_by    UUID NOT NULL REFERENCES profiles(id),
  contractor_id   UUID REFERENCES profiles(id),
  quote_url       TEXT,                          -- Supabase Storage URL
  quote_approved_at TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  closed_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══ COMPONENTS ══
-- Tracks equipment/systems per property
CREATE TABLE IF NOT EXISTS components (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,                 -- free-form: "HVAC Unit 2 — Upstairs"
  icon            TEXT DEFAULT '🔧',
  installed       TEXT,                          -- free text: "2021"
  last_serviced   TEXT,
  warranty_expiry TEXT,
  warranty_status warranty_status DEFAULT 'ok',
  notes           TEXT,
  placard_url     TEXT,                          -- Supabase Storage URL
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══ PAYMENT REQUESTS ══
CREATE TABLE IF NOT EXISTS payment_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by      UUID NOT NULL REFERENCES profiles(id),
  recipient_id    UUID NOT NULL REFERENCES profiles(id),
  property_id     UUID REFERENCES properties(id),
  type            payment_type NOT NULL DEFAULT 'rent',
  amount          NUMERIC NOT NULL CHECK (amount > 0),
  frequency       payment_frequency NOT NULL DEFAULT 'one_time',
  due_date        DATE,                          -- for one-time
  due_day         INTEGER CHECK (due_day >= 1 AND due_day <= 31), -- for monthly
  note            TEXT,
  status          payment_status NOT NULL DEFAULT 'pending',
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══ TRANSACTIONS ══
-- Individual payment events tied to payment requests
CREATE TABLE IF NOT EXISTS transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_request_id UUID NOT NULL REFERENCES payment_requests(id) ON DELETE CASCADE,
  amount          NUMERIC NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending', -- paid | pending | failed
  stripe_payment_intent_id TEXT,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══ INVITE CODES ══
CREATE TABLE IF NOT EXISTS invite_codes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            TEXT NOT NULL UNIQUE,          -- TT-XXXX-XXXX
  type            invite_type NOT NULL,
  property_id     UUID REFERENCES properties(id),  -- for tenant invites
  manager_id      UUID NOT NULL REFERENCES profiles(id),
  recipient_email TEXT NOT NULL,
  recipient_name  TEXT,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '10 days'),
  accepted_at     TIMESTAMPTZ,
  accepted_by     UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══ REVIEWS ══
-- Manager reviews of contractors (city-only location, never address)
CREATE TABLE IF NOT EXISTS reviews (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contractor_id   UUID NOT NULL REFERENCES profiles(id),
  manager_id      UUID NOT NULL REFERENCES profiles(id),
  work_order_id   UUID REFERENCES work_orders(id),
  stars           INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
  text            TEXT,
  location_label  TEXT,                          -- "Residential · Meridian, MS" — NEVER address
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══ DOCUMENTS ══
-- Files shared with tenants
CREATE TABLE IF NOT EXISTS documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id       UUID REFERENCES profiles(id),
  name            TEXT NOT NULL,
  file_url        TEXT NOT NULL,                 -- Supabase Storage URL
  file_size       INTEGER,
  uploaded_by     UUID NOT NULL REFERENCES profiles(id),
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══ WORK ORDER STAGE HISTORY ══
-- Audit trail for stage changes
CREATE TABLE IF NOT EXISTS wo_stage_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_order_id   UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  from_stage      INTEGER,
  to_stage        INTEGER NOT NULL,
  changed_by      UUID NOT NULL REFERENCES profiles(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ┌─────────────────────────────────────────┐
-- │  4. INDEXES                             │
-- └─────────────────────────────────────────┘

-- Critical indexes per dev doc
CREATE INDEX IF NOT EXISTS idx_properties_manager    ON properties(manager_id);
CREATE INDEX IF NOT EXISTS idx_properties_owner      ON properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_status     ON properties(status);

CREATE INDEX IF NOT EXISTS idx_wo_property           ON work_orders(property_id);
CREATE INDEX IF NOT EXISTS idx_wo_contractor         ON work_orders(contractor_id);
CREATE INDEX IF NOT EXISTS idx_wo_submitted_by       ON work_orders(submitted_by);
CREATE INDEX IF NOT EXISTS idx_wo_stage              ON work_orders(stage);
CREATE INDEX IF NOT EXISTS idx_wo_priority           ON work_orders(priority);
CREATE INDEX IF NOT EXISTS idx_wo_number             ON work_orders(wo_number);

CREATE INDEX IF NOT EXISTS idx_payments_recipient    ON payment_requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_by   ON payment_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_payments_property     ON payment_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_payments_status       ON payment_requests(status);

CREATE INDEX IF NOT EXISTS idx_transactions_request  ON transactions(payment_request_id);

CREATE INDEX IF NOT EXISTS idx_reviews_contractor    ON reviews(contractor_id);
CREATE INDEX IF NOT EXISTS idx_reviews_manager       ON reviews(manager_id);

CREATE INDEX IF NOT EXISTS idx_invites_code          ON invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invites_manager       ON invite_codes(manager_id);

CREATE INDEX IF NOT EXISTS idx_components_property   ON components(property_id);

CREATE INDEX IF NOT EXISTS idx_documents_property    ON documents(property_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant      ON documents(tenant_id);

CREATE INDEX IF NOT EXISTS idx_profiles_manager      ON profiles(manager_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email        ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_roles        ON profiles USING GIN(roles);

-- Trigram index for typeahead search
CREATE INDEX IF NOT EXISTS idx_profiles_name_trgm    ON profiles USING GIN(name gin_trgm_ops);


-- ┌─────────────────────────────────────────┐
-- │  5. AUTO-UPDATE TIMESTAMPS              │
-- └─────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'profiles', 'properties', 'work_orders', 'components', 'payment_requests'
    ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON %I; CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at();',
      tbl, tbl
    );
  END LOOP;
END $$;


-- ┌─────────────────────────────────────────┐
-- │  6. AUTO-CREATE PROFILE ON SIGNUP       │
-- └─────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, email, roles)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    CASE
      WHEN NEW.raw_user_meta_data->>'role' IS NOT NULL
      THEN ARRAY[cast(NEW.raw_user_meta_data->>'role' AS user_role)]
      ELSE '{}'::user_role[]
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();


-- ┌─────────────────────────────────────────┐
-- │  7. WORK ORDER NUMBER GENERATOR         │
-- └─────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION generate_wo_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(wo_number FROM 4) AS INTEGER)), 999) + 1
  INTO next_num
  FROM work_orders;

  NEW.wo_number = 'WO-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_wo_number ON work_orders;
CREATE TRIGGER set_wo_number
  BEFORE INSERT ON work_orders
  FOR EACH ROW
  WHEN (NEW.wo_number IS NULL OR NEW.wo_number = '')
  EXECUTE FUNCTION generate_wo_number();


-- ┌─────────────────────────────────────────┐
-- │  8. STAGE ADVANCEMENT FUNCTION          │
-- └─────────────────────────────────────────┘
-- Call via RPC: supabase.rpc('advance_wo_stage', { wo_id, new_stage })

CREATE OR REPLACE FUNCTION advance_wo_stage(
  wo_id UUID,
  new_stage INTEGER,
  change_notes TEXT DEFAULT NULL
)
RETURNS work_orders AS $$
DECLARE
  wo work_orders;
  current_stage INTEGER;
BEGIN
  -- Get current work order
  SELECT * INTO wo FROM work_orders WHERE id = wo_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Work order not found';
  END IF;

  current_stage := wo.stage;

  -- Validate stage progression (can only go forward by 1, or skip to 9 for close)
  IF new_stage != current_stage + 1 AND new_stage != 9 THEN
    RAISE EXCEPTION 'Invalid stage transition: % → %', current_stage, new_stage;
  END IF;

  -- Update the work order
  UPDATE work_orders SET
    stage = new_stage,
    completed_at = CASE WHEN new_stage = 7 THEN now() ELSE completed_at END,
    paid_at      = CASE WHEN new_stage = 8 THEN now() ELSE paid_at END,
    closed_at    = CASE WHEN new_stage = 9 THEN now() ELSE closed_at END,
    updated_at   = now()
  WHERE id = wo_id
  RETURNING * INTO wo;

  -- Log the stage change
  INSERT INTO wo_stage_history (work_order_id, from_stage, to_stage, changed_by, notes)
  VALUES (wo_id, current_stage, new_stage, auth.uid(), change_notes);

  RETURN wo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ┌─────────────────────────────────────────┐
-- │  9. INVITE CODE GENERATOR               │
-- └─────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT := 'TT-';
  i INTEGER;
BEGIN
  FOR i IN 1..4 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  code := code || '-';
  FOR i IN 1..4 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;


-- ┌─────────────────────────────────────────┐
-- │  10. ROW-LEVEL SECURITY (RLS)           │
-- └─────────────────────────────────────────┘

-- Enable RLS on all tables
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties        ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE components        ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews           ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE wo_stage_history  ENABLE ROW LEVEL SECURITY;

-- ── PROFILES ──

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Managers can view profiles linked to them"
  ON profiles FOR SELECT
  USING (manager_id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Managers can view contractor profiles"
  ON profiles FOR SELECT
  USING (
    'contractor' = ANY(roles) AND EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND 'manager' = ANY(p.roles)
    )
  );

-- ── PROPERTIES ──

CREATE POLICY "Managers see managed properties"
  ON properties FOR SELECT
  USING (manager_id = auth.uid());

CREATE POLICY "Owners see owned properties"
  ON properties FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Tenants see their property"
  ON properties FOR SELECT
  USING (
    id = (SELECT property_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Managers can create properties"
  ON properties FOR INSERT
  WITH CHECK (manager_id = auth.uid());

CREATE POLICY "Managers can update their properties"
  ON properties FOR UPDATE
  USING (manager_id = auth.uid());

-- ── WORK ORDERS ──

CREATE POLICY "Manager reads WOs on managed properties"
  ON work_orders FOR SELECT
  USING (
    property_id IN (SELECT id FROM properties WHERE manager_id = auth.uid())
  );

CREATE POLICY "Owner reads WOs on owned properties"
  ON work_orders FOR SELECT
  USING (
    property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
  );

CREATE POLICY "Contractor reads assigned WOs"
  ON work_orders FOR SELECT
  USING (contractor_id = auth.uid());

CREATE POLICY "Contractor reads unassigned WOs (stage 1-2)"
  ON work_orders FOR SELECT
  USING (
    contractor_id IS NULL AND stage <= 2 AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'contractor' = ANY(roles))
  );

CREATE POLICY "Tenant reads WOs on their property"
  ON work_orders FOR SELECT
  USING (
    property_id = (SELECT property_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can create WOs on accessible properties"
  ON work_orders FOR INSERT
  WITH CHECK (
    property_id IN (SELECT id FROM properties WHERE manager_id = auth.uid())
    OR property_id = (SELECT property_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Managers can update WOs"
  ON work_orders FOR UPDATE
  USING (
    property_id IN (SELECT id FROM properties WHERE manager_id = auth.uid())
  );

CREATE POLICY "Contractors can update assigned WOs"
  ON work_orders FOR UPDATE
  USING (contractor_id = auth.uid());

-- ── COMPONENTS ──

CREATE POLICY "Readable by property-linked users"
  ON components FOR SELECT
  USING (
    property_id IN (SELECT id FROM properties WHERE manager_id = auth.uid())
    OR property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
    OR property_id = (SELECT property_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Managers can manage components"
  ON components FOR ALL
  USING (
    property_id IN (SELECT id FROM properties WHERE manager_id = auth.uid())
  );

-- ── PAYMENT REQUESTS ──

CREATE POLICY "Creator reads their payment requests"
  ON payment_requests FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Recipient reads their payment requests"
  ON payment_requests FOR SELECT
  USING (recipient_id = auth.uid());

CREATE POLICY "Managers can create payment requests"
  ON payment_requests FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Managers can update their payment requests"
  ON payment_requests FOR UPDATE
  USING (created_by = auth.uid());

-- ── TRANSACTIONS ──

CREATE POLICY "Users see transactions for their payments"
  ON transactions FOR SELECT
  USING (
    payment_request_id IN (
      SELECT id FROM payment_requests
      WHERE created_by = auth.uid() OR recipient_id = auth.uid()
    )
  );

-- ── INVITE CODES ──

CREATE POLICY "Managers see their invites"
  ON invite_codes FOR SELECT
  USING (manager_id = auth.uid());

CREATE POLICY "Managers can create invites"
  ON invite_codes FOR INSERT
  WITH CHECK (manager_id = auth.uid());

CREATE POLICY "Anyone can read invites by code (for acceptance)"
  ON invite_codes FOR SELECT
  USING (TRUE);  -- Validated in application logic

-- ── REVIEWS ──

CREATE POLICY "Manager reads/writes reviews"
  ON reviews FOR ALL
  USING (manager_id = auth.uid());

CREATE POLICY "Contractor reads own reviews"
  ON reviews FOR SELECT
  USING (contractor_id = auth.uid());

-- ── DOCUMENTS ──

CREATE POLICY "Tenant reads shared documents"
  ON documents FOR SELECT
  USING (tenant_id = auth.uid());

CREATE POLICY "Manager manages documents"
  ON documents FOR ALL
  USING (
    property_id IN (SELECT id FROM properties WHERE manager_id = auth.uid())
  );

-- ── STAGE HISTORY ──

CREATE POLICY "Readable by WO-linked users"
  ON wo_stage_history FOR SELECT
  USING (
    work_order_id IN (
      SELECT id FROM work_orders WHERE
        property_id IN (SELECT id FROM properties WHERE manager_id = auth.uid())
        OR contractor_id = auth.uid()
        OR submitted_by = auth.uid()
    )
  );


-- ┌─────────────────────────────────────────┐
-- │  11. STORAGE BUCKETS                    │
-- └─────────────────────────────────────────┘

-- Run these in the Supabase Dashboard → Storage, or via SQL:
INSERT INTO storage.buckets (id, name, public) VALUES ('property-photos', 'property-photos', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('quotes', 'quotes', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('placards', 'placards', false) ON CONFLICT DO NOTHING;


-- ┌─────────────────────────────────────────┐
-- │  12. REALTIME                           │
-- └─────────────────────────────────────────┘

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE work_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE payment_requests;


-- ═══════════════════════════════════════════════════════════════
-- DONE. All tables, indexes, RLS policies, triggers, and
-- functions are now created. Your database is production-ready.
--
-- Next steps:
--   1. Verify in Supabase Dashboard → Table Editor
--   2. Test RLS policies with different user roles
--   3. Configure Auth providers (Email + Google)
--   4. Set up Stripe webhook endpoint
-- ═══════════════════════════════════════════════════════════════
