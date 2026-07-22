-- ============================================================
-- PGFindR v2 migration
-- Adds: sharing_types, amenities, reviews, owner_documents
-- Patches: pg_photos.type column
-- Adds:  admin RLS policies, indexes, Realtime for sharing_types
-- ============================================================

-- ----------------------------------------------------------
-- 1. Admin helper (SECURITY DEFINER so it bypasses RLS)
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ----------------------------------------------------------
-- 2. Patch pg_photos – add type column
-- ----------------------------------------------------------
ALTER TABLE pg_photos
  ADD COLUMN IF NOT EXISTS type TEXT
    CHECK (type IN ('room', 'common', 'exterior', 'kitchen', 'washroom'));

-- ----------------------------------------------------------
-- 3. sharing_types  (one row per sharing config per PG)
-- ----------------------------------------------------------
CREATE TABLE sharing_types (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_id            UUID    REFERENCES pg_listings(id) ON DELETE CASCADE NOT NULL,
  type             INTEGER NOT NULL CHECK (type IN (1, 2, 3, 4)),   -- 1=single, 2=double, 3=triple, 4=dormitory
  price_monthly    INTEGER NOT NULL DEFAULT 0,
  price_daily      INTEGER,
  total_beds       INTEGER NOT NULL DEFAULT 0,
  occupied_beds    INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (pg_id, type)
);

ALTER TABLE sharing_types ENABLE ROW LEVEL SECURITY;

-- Public can read sharing types for any PG
CREATE POLICY "select_sharing_types" ON sharing_types
  FOR SELECT USING (true);

-- Owners manage their own PG sharing types
CREATE POLICY "insert_sharing_types_owner" ON sharing_types
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM pg_listings WHERE id = pg_id AND owner_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY "update_sharing_types_owner" ON sharing_types
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM pg_listings WHERE id = pg_id AND owner_id = auth.uid())
    OR is_admin()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM pg_listings WHERE id = pg_id AND owner_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY "delete_sharing_types_owner" ON sharing_types
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM pg_listings WHERE id = pg_id AND owner_id = auth.uid())
    OR is_admin()
  );

-- ----------------------------------------------------------
-- 4. amenities
-- ----------------------------------------------------------
CREATE TABLE amenities (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_id        UUID    REFERENCES pg_listings(id) ON DELETE CASCADE NOT NULL,
  key          TEXT    NOT NULL CHECK (key IN ('wifi', 'ac', 'food_veg', 'food_nonveg', 'laundry', 'parking', 'cctv', 'generator')),
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (pg_id, key)
);

ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_amenities" ON amenities
  FOR SELECT USING (true);

CREATE POLICY "insert_amenities_owner" ON amenities
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM pg_listings WHERE id = pg_id AND owner_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY "update_amenities_owner" ON amenities
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM pg_listings WHERE id = pg_id AND owner_id = auth.uid())
    OR is_admin()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM pg_listings WHERE id = pg_id AND owner_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY "delete_amenities_owner" ON amenities
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM pg_listings WHERE id = pg_id AND owner_id = auth.uid())
    OR is_admin()
  );

-- ----------------------------------------------------------
-- 5. reviews
-- ----------------------------------------------------------
CREATE TABLE reviews (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID    REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  pg_id      UUID    REFERENCES pg_listings(id) ON DELETE CASCADE NOT NULL,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, pg_id)   -- one review per user per PG
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews for approved PGs
CREATE POLICY "select_reviews" ON reviews
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM pg_listings WHERE id = pg_id AND status = 'approved')
    OR is_admin()
  );

CREATE POLICY "insert_reviews" ON reviews
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_reviews" ON reviews
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_reviews" ON reviews
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR is_admin());

-- ----------------------------------------------------------
-- 6. owner_documents
-- ----------------------------------------------------------
CREATE TABLE owner_documents (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID    REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  doc_type   TEXT    NOT NULL CHECK (doc_type IN ('id_proof', 'address_proof', 'ownership_proof')),
  url        TEXT    NOT NULL,
  verified   BOOLEAN NOT NULL DEFAULT FALSE,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE owner_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_documents" ON owner_documents
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR is_admin());

CREATE POLICY "insert_own_documents" ON owner_documents
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "update_own_documents" ON owner_documents
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id OR is_admin())
  WITH CHECK (auth.uid() = owner_id OR is_admin());

CREATE POLICY "delete_own_documents" ON owner_documents
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id OR is_admin());

-- ----------------------------------------------------------
-- 7. Admin RLS policies on existing tables
-- ----------------------------------------------------------

-- profiles
CREATE POLICY "admin_all_profiles" ON profiles
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- pg_listings
CREATE POLICY "admin_all_pg_listings" ON pg_listings
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- beds
CREATE POLICY "admin_all_beds" ON beds
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- pg_photos
CREATE POLICY "admin_all_pg_photos" ON pg_photos
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- inquiries
CREATE POLICY "admin_all_inquiries" ON inquiries
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- bookings
CREATE POLICY "admin_all_bookings" ON bookings
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- payments
CREATE POLICY "admin_all_payments" ON payments
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- owner_kyc
CREATE POLICY "admin_all_owner_kyc" ON owner_kyc
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------
-- 8. Indexes
-- ----------------------------------------------------------

-- Geo queries on PG listings
CREATE INDEX IF NOT EXISTS idx_pg_listings_lat_lng
  ON pg_listings (latitude, longitude);

-- Inquiry lookups
CREATE INDEX IF NOT EXISTS idx_inquiries_seeker_id
  ON inquiries (seeker_id);

CREATE INDEX IF NOT EXISTS idx_inquiries_pg_id
  ON inquiries (pg_id);

-- Booking lookup by inquiry
CREATE INDEX IF NOT EXISTS idx_bookings_inquiry_id
  ON bookings (inquiry_id);

-- Additional useful indexes
CREATE INDEX IF NOT EXISTS idx_pg_listings_city
  ON pg_listings (city);

CREATE INDEX IF NOT EXISTS idx_pg_listings_status
  ON pg_listings (status);

CREATE INDEX IF NOT EXISTS idx_reviews_pg_id
  ON reviews (pg_id);

CREATE INDEX IF NOT EXISTS idx_sharing_types_pg_id
  ON sharing_types (pg_id);

-- ----------------------------------------------------------
-- 9. Realtime – enable sharing_types so bed availability
--    pushes to all subscribed clients immediately
-- ----------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE sharing_types;
