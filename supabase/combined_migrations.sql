-- =========================================================================
-- COMBINED INITIAL SCHEMA, POLICIES, TRIGGERS AND SEEDING FOR PGFINDR
-- Copy and run this script in your Supabase SQL Editor
-- =========================================================================

-- FIX: allows forward-referencing tables inside function bodies (e.g. is_admin()
-- references public.profiles before that table is created later in this script).
-- This is a session-local setting and does not affect anything else.
SET LOCAL check_function_bodies = off;

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 3. CORE TABLES

-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'seeker' CHECK (role IN ('seeker', 'owner', 'admin')),
  fcm_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PG LISTINGS
CREATE TABLE IF NOT EXISTS public.pg_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  locality TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  pg_type TEXT NOT NULL DEFAULT 'co-ed' CHECK (pg_type IN ('boys', 'girls', 'co-ed')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'inactive')),
  total_beds INTEGER DEFAULT 0,
  available_beds INTEGER DEFAULT 0,
  monthly_rent_min INTEGER DEFAULT 0,
  monthly_rent_max INTEGER DEFAULT 0,
  deposit_amount INTEGER DEFAULT 0,
  food_included BOOLEAN DEFAULT FALSE,
  wifi_included BOOLEAN DEFAULT FALSE,
  ac_rooms BOOLEAN DEFAULT FALSE,
  parking BOOLEAN DEFAULT FALSE,
  laundry BOOLEAN DEFAULT FALSE,
  security_24x7 BOOLEAN DEFAULT FALSE,
  rules TEXT,
  commission_rate DECIMAL(5,2) DEFAULT 10.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BEDS
CREATE TABLE IF NOT EXISTS public.beds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_id UUID REFERENCES public.pg_listings(id) ON DELETE CASCADE NOT NULL,
  room_number TEXT NOT NULL,
  bed_label TEXT NOT NULL DEFAULT 'Bed 1',
  sharing_type TEXT NOT NULL DEFAULT 'single' CHECK (sharing_type IN ('single', 'double', 'triple', 'dormitory')),
  monthly_rent INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'maintenance')),
  floor_number INTEGER DEFAULT 1,
  has_ac BOOLEAN DEFAULT FALSE,
  has_attached_bath BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PG PHOTOS
CREATE TABLE IF NOT EXISTS public.pg_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_id UUID REFERENCES public.pg_listings(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  caption TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  type TEXT CHECK (type IN ('room', 'common', 'exterior', 'kitchen', 'washroom')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SHARING TYPES
CREATE TABLE IF NOT EXISTS public.sharing_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_id UUID REFERENCES public.pg_listings(id) ON DELETE CASCADE NOT NULL,
  type INTEGER NOT NULL CHECK (type IN (1, 2, 3, 4)),
  price_monthly INTEGER NOT NULL DEFAULT 0,
  price_daily INTEGER,
  total_beds INTEGER NOT NULL DEFAULT 0,
  occupied_beds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (pg_id, type)
);

-- AMENITIES
CREATE TABLE IF NOT EXISTS public.amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_id UUID REFERENCES public.pg_listings(id) ON DELETE CASCADE NOT NULL,
  key TEXT NOT NULL CHECK (key IN ('wifi', 'ac', 'food_veg', 'food_nonveg', 'laundry', 'parking', 'cctv', 'generator')),
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (pg_id, key)
);

-- INQUIRIES
CREATE TABLE IF NOT EXISTS public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_id UUID REFERENCES public.pg_listings(id) NOT NULL,
  seeker_id UUID REFERENCES public.profiles(id) NOT NULL,
  bed_id UUID REFERENCES public.beds(id),
  message TEXT,
  move_in_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'confirmed', 'cancelled')),
  owner_notes TEXT,
  age INTEGER CHECK (age >= 18 AND age <= 60),
  occupation TEXT CHECK (occupation IN ('Student', 'Working Professional', 'Other')),
  city_of_origin TEXT,
  duration_value INTEGER,
  duration_unit TEXT CHECK (duration_unit IN ('days', 'months')),
  sharing_preference INTEGER CHECK (sharing_preference IN (1, 2, 3, 4)),
  mobile TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PAYMENTS TABLE (Before Bookings for Foreign Key link)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID,
  seeker_id UUID REFERENCES public.profiles(id) NOT NULL,
  amount INTEGER NOT NULL,
  commission_rate DECIMAL(5,2) DEFAULT 10.00,
  commission_amount INTEGER NOT NULL DEFAULT 0,
  owner_payout INTEGER NOT NULL DEFAULT 0,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_payout_id TEXT,
  disbursed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_type TEXT NOT NULL DEFAULT 'deposit' CHECK (payment_type IN ('deposit', 'monthly_rent')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BOOKINGS
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID REFERENCES public.inquiries(id),
  pg_id UUID REFERENCES public.pg_listings(id) NOT NULL,
  seeker_id UUID REFERENCES public.profiles(id) NOT NULL,
  owner_id UUID REFERENCES public.profiles(id) NOT NULL,
  bed_id UUID REFERENCES public.beds(id) NOT NULL,
  monthly_rent INTEGER NOT NULL,
  deposit_amount INTEGER NOT NULL DEFAULT 0,
  amount INTEGER NOT NULL DEFAULT 0,
  commission_pct NUMERIC(5,2) DEFAULT 10.00,
  commission_amount INTEGER NOT NULL DEFAULT 0,
  owner_payout INTEGER NOT NULL DEFAULT 0,
  payment_id UUID REFERENCES public.payments(id),
  move_in_date DATE NOT NULL,
  confirmed_at TIMESTAMPTZ,
  disbursed_at TIMESTAMPTZ,
  razorpay_payout_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'payment_done', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add booking_id foreign key constraint to payments if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'payments_booking_id_fkey'
  ) THEN
    ALTER TABLE public.payments ADD CONSTRAINT payments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id);
  END IF;
END $$;

-- OWNER KYC
CREATE TABLE IF NOT EXISTS public.owner_kyc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles(id) UNIQUE NOT NULL,
  pan_number TEXT,
  aadhaar_number TEXT,
  bank_account TEXT,
  bank_ifsc TEXT,
  bank_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- OWNER DOCUMENTS
CREATE TABLE IF NOT EXISTS public.owner_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('id_proof', 'address_proof', 'ownership_proof')),
  url TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- REVIEWS
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  pg_id UUID REFERENCES public.pg_listings(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, pg_id)
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PLATFORM SETTINGS
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- COMMISSION HISTORY
CREATE TABLE IF NOT EXISTS public.commission_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  old_rate NUMERIC NOT NULL,
  new_rate NUMERIC NOT NULL,
  changed_by UUID REFERENCES public.profiles(id),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. STORAGE BUCKETS (If Storage extension is present)
INSERT INTO storage.buckets (id, name, public) VALUES ('pg-photos', 'pg-photos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('owner-documents', 'owner-documents', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_pg_listings_lat_lng ON public.pg_listings (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_pg_listings_city ON public.pg_listings (city);
CREATE INDEX IF NOT EXISTS idx_pg_listings_status ON public.pg_listings (status);
CREATE INDEX IF NOT EXISTS idx_inquiries_seeker_id ON public.inquiries (seeker_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_pg_id ON public.inquiries (pg_id);
CREATE INDEX IF NOT EXISTS idx_bookings_inquiry_id ON public.bookings (inquiry_id);
CREATE INDEX IF NOT EXISTS idx_reviews_pg_id ON public.reviews (pg_id);
CREATE INDEX IF NOT EXISTS idx_sharing_types_pg_id ON public.sharing_types (pg_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications (user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_fcm_token ON public.profiles(fcm_token) WHERE fcm_token IS NOT NULL;

-- 6. TRIGGERS & FUNCTIONS

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'seeker')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update available_beds count
CREATE OR REPLACE FUNCTION public.update_pg_bed_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.pg_listings
  SET 
    total_beds = (SELECT COUNT(*) FROM public.beds WHERE pg_id = COALESCE(NEW.pg_id, OLD.pg_id)),
    available_beds = (SELECT COUNT(*) FROM public.beds WHERE pg_id = COALESCE(NEW.pg_id, OLD.pg_id) AND status = 'available'),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.pg_id, OLD.pg_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS beds_count_trigger ON public.beds;
CREATE TRIGGER beds_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.beds
  FOR EACH ROW EXECUTE FUNCTION public.update_pg_bed_counts();

-- 7. ENABLE ROW LEVEL SECURITY & POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pg_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pg_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sharing_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_kyc ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_history ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
CREATE POLICY "select_own_profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "select_all_profiles" ON public.profiles;
CREATE POLICY "select_all_profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
CREATE POLICY "insert_own_profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
CREATE POLICY "update_own_profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "delete_own_profile" ON public.profiles;
CREATE POLICY "delete_own_profile" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "admin_all_profiles" ON public.profiles;
CREATE POLICY "admin_all_profiles" ON public.profiles FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- PG Listings Policies
DROP POLICY IF EXISTS "select_approved_listings" ON public.pg_listings;
CREATE POLICY "select_approved_listings" ON public.pg_listings FOR SELECT USING (status = 'approved');
DROP POLICY IF EXISTS "select_own_listings" ON public.pg_listings;
CREATE POLICY "select_own_listings" ON public.pg_listings FOR SELECT TO authenticated USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "insert_own_listings" ON public.pg_listings;
CREATE POLICY "insert_own_listings" ON public.pg_listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "update_own_listings" ON public.pg_listings;
CREATE POLICY "update_own_listings" ON public.pg_listings FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "delete_own_listings" ON public.pg_listings;
CREATE POLICY "delete_own_listings" ON public.pg_listings FOR DELETE TO authenticated USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "admin_all_pg_listings" ON public.pg_listings;
CREATE POLICY "admin_all_pg_listings" ON public.pg_listings FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Beds Policies
DROP POLICY IF EXISTS "select_beds" ON public.beds;
CREATE POLICY "select_beds" ON public.beds FOR SELECT USING (true);
DROP POLICY IF EXISTS "insert_beds" ON public.beds;
CREATE POLICY "insert_beds" ON public.beds FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.pg_listings WHERE id = pg_id AND owner_id = auth.uid()) OR is_admin());
DROP POLICY IF EXISTS "update_beds" ON public.beds;
CREATE POLICY "update_beds" ON public.beds FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.pg_listings WHERE id = pg_id AND owner_id = auth.uid()) OR is_admin()) WITH CHECK (EXISTS (SELECT 1 FROM public.pg_listings WHERE id = pg_id AND owner_id = auth.uid()) OR is_admin());
DROP POLICY IF EXISTS "delete_beds" ON public.beds;
CREATE POLICY "delete_beds" ON public.beds FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.pg_listings WHERE id = pg_id AND owner_id = auth.uid()) OR is_admin());

-- Photos Policies
DROP POLICY IF EXISTS "select_photos" ON public.pg_photos;
CREATE POLICY "select_photos" ON public.pg_photos FOR SELECT USING (true);
DROP POLICY IF EXISTS "insert_photos" ON public.pg_photos;
CREATE POLICY "insert_photos" ON public.pg_photos FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.pg_listings WHERE id = pg_id AND owner_id = auth.uid()) OR is_admin());
DROP POLICY IF EXISTS "update_photos" ON public.pg_photos;
CREATE POLICY "update_photos" ON public.pg_photos FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.pg_listings WHERE id = pg_id AND owner_id = auth.uid()) OR is_admin()) WITH CHECK (EXISTS (SELECT 1 FROM public.pg_listings WHERE id = pg_id AND owner_id = auth.uid()) OR is_admin());
DROP POLICY IF EXISTS "delete_photos" ON public.pg_photos;
CREATE POLICY "delete_photos" ON public.pg_photos FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.pg_listings WHERE id = pg_id AND owner_id = auth.uid()) OR is_admin());

-- Sharing Types Policies
DROP POLICY IF EXISTS "select_sharing_types" ON public.sharing_types;
CREATE POLICY "select_sharing_types" ON public.sharing_types FOR SELECT USING (true);
DROP POLICY IF EXISTS "insert_sharing_types_owner" ON public.sharing_types;
CREATE POLICY "insert_sharing_types_owner" ON public.sharing_types FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.pg_listings WHERE id = pg_id AND owner_id = auth.uid()) OR is_admin());
DROP POLICY IF EXISTS "update_sharing_types_owner" ON public.sharing_types;
CREATE POLICY "update_sharing_types_owner" ON public.sharing_types FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.pg_listings WHERE id = pg_id AND owner_id = auth.uid()) OR is_admin()) WITH CHECK (EXISTS (SELECT 1 FROM public.pg_listings WHERE id = pg_id AND owner_id = auth.uid()) OR is_admin());
DROP POLICY IF EXISTS "delete_sharing_types_owner" ON public.sharing_types;
CREATE POLICY "delete_sharing_types_owner" ON public.sharing_types FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.pg_listings WHERE id = pg_id AND owner_id = auth.uid()) OR is_admin());

-- Amenities Policies
DROP POLICY IF EXISTS "select_amenities" ON public.amenities;
CREATE POLICY "select_amenities" ON public.amenities FOR SELECT USING (true);
DROP POLICY IF EXISTS "insert_amenities_owner" ON public.amenities;
CREATE POLICY "insert_amenities_owner" ON public.amenities FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.pg_listings WHERE id = pg_id AND owner_id = auth.uid()) OR is_admin());
DROP POLICY IF EXISTS "update_amenities_owner" ON public.amenities;
CREATE POLICY "update_amenities_owner" ON public.amenities FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.pg_listings WHERE id = pg_id AND owner_id = auth.uid()) OR is_admin()) WITH CHECK (EXISTS (SELECT 1 FROM public.pg_listings WHERE id = pg_id AND owner_id = auth.uid()) OR is_admin());
DROP POLICY IF EXISTS "delete_amenities_owner" ON public.amenities;
CREATE POLICY "delete_amenities_owner" ON public.amenities FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.pg_listings WHERE id = pg_id AND owner_id = auth.uid()) OR is_admin());

-- Inquiries Policies
DROP POLICY IF EXISTS "select_own_inquiries_seeker" ON public.inquiries;
CREATE POLICY "select_own_inquiries_seeker" ON public.inquiries FOR SELECT TO authenticated USING (auth.uid() = seeker_id);
DROP POLICY IF EXISTS "select_own_inquiries_owner" ON public.inquiries;
CREATE POLICY "select_own_inquiries_owner" ON public.inquiries FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.pg_listings WHERE id = pg_id AND owner_id = auth.uid()));
DROP POLICY IF EXISTS "insert_inquiries" ON public.inquiries;
CREATE POLICY "insert_inquiries" ON public.inquiries FOR INSERT TO public WITH CHECK (true);
DROP POLICY IF EXISTS "update_inquiries_seeker" ON public.inquiries;
CREATE POLICY "update_inquiries_seeker" ON public.inquiries FOR UPDATE TO authenticated USING (auth.uid() = seeker_id) WITH CHECK (auth.uid() = seeker_id);
DROP POLICY IF EXISTS "update_inquiries_owner" ON public.inquiries;
CREATE POLICY "update_inquiries_owner" ON public.inquiries FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.pg_listings WHERE id = pg_id AND owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.pg_listings WHERE id = pg_id AND owner_id = auth.uid()));
DROP POLICY IF EXISTS "delete_inquiries" ON public.inquiries;
CREATE POLICY "delete_inquiries" ON public.inquiries FOR DELETE TO authenticated USING (auth.uid() = seeker_id);
DROP POLICY IF EXISTS "admin_all_inquiries" ON public.inquiries;
CREATE POLICY "admin_all_inquiries" ON public.inquiries FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Bookings Policies
DROP POLICY IF EXISTS "select_bookings_seeker" ON public.bookings;
CREATE POLICY "select_bookings_seeker" ON public.bookings FOR SELECT TO authenticated USING (auth.uid() = seeker_id);
DROP POLICY IF EXISTS "select_bookings_owner" ON public.bookings;
CREATE POLICY "select_bookings_owner" ON public.bookings FOR SELECT TO authenticated USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "insert_bookings" ON public.bookings;
CREATE POLICY "insert_bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = seeker_id);
DROP POLICY IF EXISTS "update_bookings_seeker" ON public.bookings;
CREATE POLICY "update_bookings_seeker" ON public.bookings FOR UPDATE TO authenticated USING (auth.uid() = seeker_id) WITH CHECK (auth.uid() = seeker_id);
DROP POLICY IF EXISTS "update_bookings_owner" ON public.bookings;
CREATE POLICY "update_bookings_owner" ON public.bookings FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "delete_bookings" ON public.bookings;
CREATE POLICY "delete_bookings" ON public.bookings FOR DELETE TO authenticated USING (auth.uid() = seeker_id);
DROP POLICY IF EXISTS "admin_all_bookings" ON public.bookings;
CREATE POLICY "admin_all_bookings" ON public.bookings FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Payments Policies
DROP POLICY IF EXISTS "select_payments_seeker" ON public.payments;
CREATE POLICY "select_payments_seeker" ON public.payments FOR SELECT TO authenticated USING (auth.uid() = seeker_id);
DROP POLICY IF EXISTS "select_payments_owner" ON public.payments;
CREATE POLICY "select_payments_owner" ON public.payments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.bookings WHERE id = booking_id AND owner_id = auth.uid()));
DROP POLICY IF EXISTS "insert_payments" ON public.payments;
CREATE POLICY "insert_payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (auth.uid() = seeker_id);
DROP POLICY IF EXISTS "update_payments" ON public.payments;
CREATE POLICY "update_payments" ON public.payments FOR UPDATE TO authenticated USING (auth.uid() = seeker_id) WITH CHECK (auth.uid() = seeker_id);
DROP POLICY IF EXISTS "delete_payments" ON public.payments;
CREATE POLICY "delete_payments" ON public.payments FOR DELETE TO authenticated USING (auth.uid() = seeker_id);
DROP POLICY IF EXISTS "admin_all_payments" ON public.payments;
CREATE POLICY "admin_all_payments" ON public.payments FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Owner KYC Policies
DROP POLICY IF EXISTS "select_own_kyc" ON public.owner_kyc;
CREATE POLICY "select_own_kyc" ON public.owner_kyc FOR SELECT TO authenticated USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "insert_own_kyc" ON public.owner_kyc;
CREATE POLICY "insert_own_kyc" ON public.owner_kyc FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "update_own_kyc" ON public.owner_kyc;
CREATE POLICY "update_own_kyc" ON public.owner_kyc FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "delete_own_kyc" ON public.owner_kyc;
CREATE POLICY "delete_own_kyc" ON public.owner_kyc FOR DELETE TO authenticated USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "admin_all_owner_kyc" ON public.owner_kyc;
CREATE POLICY "admin_all_owner_kyc" ON public.owner_kyc FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Notifications Policies
DROP POLICY IF EXISTS "select_own_notifications" ON public.notifications;
CREATE POLICY "select_own_notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_notifications" ON public.notifications;
CREATE POLICY "update_own_notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_notifications" ON public.notifications;
CREATE POLICY "delete_own_notifications" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Settings & History Admin Policies
DROP POLICY IF EXISTS "settings_select_admin" ON public.platform_settings;
CREATE POLICY "settings_select_admin" ON public.platform_settings FOR SELECT TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "settings_insert_admin" ON public.platform_settings;
CREATE POLICY "settings_insert_admin" ON public.platform_settings FOR INSERT TO authenticated WITH CHECK (is_admin());
DROP POLICY IF EXISTS "settings_update_admin" ON public.platform_settings;
CREATE POLICY "settings_update_admin" ON public.platform_settings FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "commission_history_select_admin" ON public.commission_history;
CREATE POLICY "commission_history_select_admin" ON public.commission_history FOR SELECT TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "commission_history_insert_admin" ON public.commission_history;
CREATE POLICY "commission_history_insert_admin" ON public.commission_history FOR INSERT TO authenticated WITH CHECK (is_admin());

-- 8. REALTIME PUBLICATIONS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.beds;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pg_listings;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inquiries;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sharing_types;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Default Platform Setting
INSERT INTO public.platform_settings (key, value, description)
VALUES ('default_commission_rate', '10.00', 'Default platform commission percentage for new PG listings')
ON CONFLICT (key) DO NOTHING;

-- 9. DUMMY DATA SEEDING (24 PGs & Owners across 8 locations)
DO $$
DECLARE
  v_owner_1 UUID := 'a1111111-1111-4111-a111-111111111101';
  v_owner_2 UUID := 'a1111111-1111-4111-a111-111111111102';
  v_owner_3 UUID := 'a1111111-1111-4111-a111-111111111103';
  v_owner_4 UUID := 'a1111111-1111-4111-a111-111111111104';
  v_owner_5 UUID := 'a1111111-1111-4111-a111-111111111105';
  v_owner_6 UUID := 'a1111111-1111-4111-a111-111111111106';
  v_owner_7 UUID := 'a1111111-1111-4111-a111-111111111107';
  v_owner_8 UUID := 'a1111111-1111-4111-a111-111111111108';
  v_pg_id UUID;
BEGIN
  -- Insert fake auth.users rows for the dummy owners first.
  -- This is REQUIRED because public.profiles.id has a FOREIGN KEY to auth.users(id),
  -- so a profile cannot exist for a user id that isn't a real row in auth.users.
  -- These are dummy/inactive accounts (no one can log in as them without a real signup),
  -- just enough to satisfy the FK constraint for seed data.
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token
  ) VALUES
    ('00000000-0000-0000-0000-000000000000', v_owner_1, 'authenticated', 'authenticated', 'owner1.bangalore@pgfindr.dummy', crypt('DummyPass123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', ''),
    ('00000000-0000-0000-0000-000000000000', v_owner_2, 'authenticated', 'authenticated', 'owner2.mumbai@pgfindr.dummy',    crypt('DummyPass123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', ''),
    ('00000000-0000-0000-0000-000000000000', v_owner_3, 'authenticated', 'authenticated', 'owner3.pune@pgfindr.dummy',      crypt('DummyPass123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', ''),
    ('00000000-0000-0000-0000-000000000000', v_owner_4, 'authenticated', 'authenticated', 'owner4.delhi@pgfindr.dummy',     crypt('DummyPass123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', ''),
    ('00000000-0000-0000-0000-000000000000', v_owner_5, 'authenticated', 'authenticated', 'owner5.hyderabad@pgfindr.dummy', crypt('DummyPass123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', ''),
    ('00000000-0000-0000-0000-000000000000', v_owner_6, 'authenticated', 'authenticated', 'owner6.chennai@pgfindr.dummy',   crypt('DummyPass123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', ''),
    ('00000000-0000-0000-0000-000000000000', v_owner_7, 'authenticated', 'authenticated', 'owner7.noida@pgfindr.dummy',     crypt('DummyPass123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', ''),
    ('00000000-0000-0000-0000-000000000000', v_owner_8, 'authenticated', 'authenticated', 'owner8.gurgaon@pgfindr.dummy',   crypt('DummyPass123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', '')
  ON CONFLICT (id) DO NOTHING;
  -- Note: the on_auth_user_created trigger will auto-create a basic profile row for
  -- each of these (role='seeker' by default). The INSERT below then upserts it to role='owner'.

  -- Insert dummy owner profiles
  INSERT INTO public.profiles (id, full_name, phone, role) VALUES
    (v_owner_1, 'Rajesh Sharma (Bangalore Owner)', '+91 9876543210', 'owner'),
    (v_owner_2, 'Priya Kulkarni (Mumbai Owner)', '+91 9876543211', 'owner'),
    (v_owner_3, 'Vikram Deshmukh (Pune Owner)', '+91 9876543212', 'owner'),
    (v_owner_4, 'Ankit Verma (Delhi Owner)', '+91 9876543213', 'owner'),
    (v_owner_5, 'Srinivas Rao (Hyderabad Owner)', '+91 9876543214', 'owner'),
    (v_owner_6, 'Karthik Subramanian (Chennai Owner)', '+91 9876543215', 'owner'),
    (v_owner_7, 'Sunil Tyagi (Noida Owner)', '+91 9876543216', 'owner'),
    (v_owner_8, 'Rohan Gupta (Gurgaon Owner)', '+91 9876543217', 'owner')
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, role = 'owner';

  -- Insert approved owner KYC records
  INSERT INTO public.owner_kyc (owner_id, pan_number, aadhaar_number, bank_account, bank_ifsc, bank_name, status) VALUES
    (v_owner_1, 'ABCDE1234F', '123456789012', '91827364501', 'SBIN0001234', 'State Bank of India', 'approved'),
    (v_owner_2, 'BCDEF2345G', '234567890123', '91827364502', 'HDFC0001234', 'HDFC Bank', 'approved'),
    (v_owner_3, 'CDEFG3456H', '345678901234', '91827364503', 'ICIC0001234', 'ICICI Bank', 'approved'),
    (v_owner_4, 'DEFGH4567I', '456789012345', '91827364504', 'UTIB0001234', 'Axis Bank', 'approved'),
    (v_owner_5, 'EFGHI5678J', '567890123456', '91827364505', 'SBIN0005678', 'State Bank of India', 'approved'),
    (v_owner_6, 'FGHIJ6789K', '678901234567', '91827364506', 'HDFC0005678', 'HDFC Bank', 'approved'),
    (v_owner_7, 'GHIJK7890L', '789012345678', '91827364507', 'ICIC0005678', 'ICICI Bank', 'approved'),
    (v_owner_8, 'HIJKL8901M', '890123456789', '91827364508', 'UTIB0005678', 'Axis Bank', 'approved')
  ON CONFLICT (owner_id) DO UPDATE SET status = 'approved';

  -- Bangalore PGs
  v_pg_id := 'b1111111-1111-4111-a111-111111111101';
  INSERT INTO public.pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_1, 'Starlight Premium Coliving', 'Modern luxury PG located in the heart of Koramangala near Sony World Signal. Fully furnished with high-speed WiFi, daily housekeeping, and delicious meals.', 'No. 45, 5th Block, 80 Feet Road, Koramangala', 'Bangalore', 'Koramangala', 12.9352, 77.6245, 'co-ed', 'approved', 12, 10, 9500, 18000, 15000, true, true, true, true, true, true, 'No smoking inside rooms. Visitors allowed till 9 PM.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';
  INSERT INTO public.pg_photos (pg_id, url, caption, is_primary, type) VALUES
    (v_pg_id, 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=1200&auto=format&fit=crop', 'Building Exterior', true, 'exterior'),
    (v_pg_id, 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?q=80&w=1200&auto=format&fit=crop', 'Spacious Single AC Room', false, 'room') ON CONFLICT DO NOTHING;
  INSERT INTO public.sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES (v_pg_id, 1, 18000, 4, 1), (v_pg_id, 2, 12500, 4, 1), (v_pg_id, 3, 9500, 4, 0) ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;
  INSERT INTO public.beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES (v_pg_id, '101', 'Bed A', 'single', 18000, 'available', 1, true, true), (v_pg_id, '102', 'Bed A', 'double', 12500, 'available', 1, true, true) ON CONFLICT DO NOTHING;

  v_pg_id := 'b1111111-1111-4111-a111-111111111102';
  INSERT INTO public.pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_1, 'Green View Gents Luxury PG', 'Peaceful PG for male working professionals near HSR BDA Complex. High quality South & North Indian food served 3 times a day.', 'Plot 112, Sector 3, HSR Layout', 'Bangalore', 'HSR Layout', 12.9121, 77.6446, 'boys', 'approved', 10, 8, 8500, 15000, 10000, true, true, true, true, true, true, 'Gate closes at 11:30 PM.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';
  INSERT INTO public.pg_photos (pg_id, url, caption, is_primary, type) VALUES (v_pg_id, 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?q=80&w=1200&auto=format&fit=crop', 'Comfortable Double Bed Room', true, 'room') ON CONFLICT DO NOTHING;
  INSERT INTO public.sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES (v_pg_id, 1, 15000, 2, 0), (v_pg_id, 2, 10500, 4, 1), (v_pg_id, 3, 8500, 4, 1) ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;
  INSERT INTO public.beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES (v_pg_id, '101', 'Bed A', 'single', 15000, 'available', 1, true, true) ON CONFLICT DO NOTHING;

  v_pg_id := 'b1111111-1111-4111-a111-111111111103';
  INSERT INTO public.pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_1, 'Harmony Ladies Executive Stay', 'Safe and premium ladies PG right next to 100ft Road Indiranagar and Metro Station. Biometric entry, 24/7 security guard, power backup.', '12th Main, 4th Cross, Indiranagar', 'Bangalore', 'Indiranagar', 12.9784, 77.6408, 'girls', 'approved', 8, 6, 11000, 21000, 20000, true, true, true, true, true, true, 'Strict 24/7 security.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';
  INSERT INTO public.pg_photos (pg_id, url, caption, is_primary, type) VALUES (v_pg_id, 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1200&auto=format&fit=crop', 'Cosy Bedroom', true, 'room') ON CONFLICT DO NOTHING;
  INSERT INTO public.sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES (v_pg_id, 1, 21000, 2, 1), (v_pg_id, 2, 14000, 4, 1), (v_pg_id, 3, 11000, 2, 0) ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;
  INSERT INTO public.beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES (v_pg_id, '301', 'Bed A', 'single', 21000, 'available', 3, true, true) ON CONFLICT DO NOTHING;

  -- Mumbai PGs
  v_pg_id := 'b1111111-1111-4111-a111-111111111104';
  INSERT INTO public.pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_2, 'Sea Breeze Luxury Coliving', 'Prime Bandra West location with sea view balcony rooms. Ideal for media, tech, and corporate professionals.', 'Hill Road, Near Elco Market, Bandra West', 'Mumbai', 'Bandra West', 19.0596, 72.8295, 'co-ed', 'approved', 8, 5, 16000, 32000, 30000, true, true, true, false, true, true, 'Quiet hours after 10 PM.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';
  INSERT INTO public.pg_photos (pg_id, url, caption, is_primary, type) VALUES (v_pg_id, 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=1200&auto=format&fit=crop', 'Modern Apartment Suite', true, 'room') ON CONFLICT DO NOTHING;
  INSERT INTO public.sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES (v_pg_id, 1, 32000, 2, 1), (v_pg_id, 2, 22000, 4, 1), (v_pg_id, 3, 16000, 2, 1) ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;
  INSERT INTO public.beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES (v_pg_id, '401', 'Bed A', 'single', 32000, 'available', 4, true, true) ON CONFLICT DO NOTHING;

  v_pg_id := 'b1111111-1111-4111-a111-111111111105';
  INSERT INTO public.pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_2, 'Elite Heights Gents PG', 'Close to JB Nagar Metro station and SEEPZ IT park. Includes breakfast, dinner, 500Mbps WiFi, and laundry.', 'Near JB Nagar Metro Station, Andheri East', 'Mumbai', 'Andheri East', 19.1136, 72.8697, 'boys', 'approved', 10, 7, 12000, 24000, 20000, true, true, true, true, true, true, 'ID proof required.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';
  INSERT INTO public.pg_photos (pg_id, url, caption, is_primary, type) VALUES (v_pg_id, 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?q=80&w=1200&auto=format&fit=crop', 'Comfortable AC Bedroom', true, 'room') ON CONFLICT DO NOTHING;
  INSERT INTO public.sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES (v_pg_id, 1, 24000, 2, 0), (v_pg_id, 2, 16000, 4, 1), (v_pg_id, 3, 12000, 4, 2) ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;
  INSERT INTO public.beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES (v_pg_id, '201', 'Bed A', 'single', 24000, 'available', 2, true, true) ON CONFLICT DO NOTHING;

  v_pg_id := 'b1111111-1111-4111-a111-111111111106';
  INSERT INTO public.pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_2, 'Blossom Womens Residency', 'Safe & peaceful PG for women near Hiranandani Gardens Powai and IIT Bombay. Beautiful lake view.', 'Central Avenue, Hiranandani Gardens, Powai', 'Mumbai', 'Powai', 19.1176, 72.9060, 'girls', 'approved', 9, 6, 14000, 26000, 25000, true, true, true, true, true, true, 'Visitor timing 10 AM - 7 PM.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';
  INSERT INTO public.pg_photos (pg_id, url, caption, is_primary, type) VALUES (v_pg_id, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1200&auto=format&fit=crop', 'Spacious Well lit Room', true, 'room') ON CONFLICT DO NOTHING;
  INSERT INTO public.sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES (v_pg_id, 1, 26000, 3, 1), (v_pg_id, 2, 18000, 3, 1), (v_pg_id, 3, 14000, 3, 1) ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;
  INSERT INTO public.beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES (v_pg_id, '101', 'Bed A', 'single', 26000, 'available', 1, true, true) ON CONFLICT DO NOTHING;

  -- Pune PGs
  v_pg_id := 'b1111111-1111-4111-a111-111111111107';
  INSERT INTO public.pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_3, 'Cybercity Coliving Hub', 'Direct access to Hinjewadi IT Park Phase 1. Shuttle service, gym, gaming room, and fiber WiFi.', 'Phase 1, Near Rajiv Gandhi IT Park, Hinjewadi', 'Pune', 'Hinjewadi', 18.5912, 73.7389, 'co-ed', 'approved', 15, 12, 7000, 14000, 10000, true, true, true, true, true, true, 'Zero disturbance policy.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';
  INSERT INTO public.pg_photos (pg_id, url, caption, is_primary, type) VALUES (v_pg_id, 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1200&auto=format&fit=crop', 'Modern PG Building', true, 'exterior') ON CONFLICT DO NOTHING;
  INSERT INTO public.sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES (v_pg_id, 1, 14000, 3, 1), (v_pg_id, 2, 9500, 6, 1), (v_pg_id, 3, 7000, 6, 1) ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;
  INSERT INTO public.beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES (v_pg_id, '101', 'Bed A', 'single', 14000, 'available', 1, true, true) ON CONFLICT DO NOTHING;

  v_pg_id := 'b1111111-1111-4111-a111-111111111108';
  INSERT INTO public.pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_3, 'Viman Nagar Executive PG', 'Located near Symbiosis International University and Phoenix Marketcity. Best suited for students and young professionals.', 'Behind Phoenix Marketcity, Viman Nagar', 'Pune', 'Viman Nagar', 18.5679, 73.9143, 'co-ed', 'approved', 12, 9, 8000, 16000, 12000, true, true, true, true, true, true, 'Self cooking facility available.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';
  INSERT INTO public.pg_photos (pg_id, url, caption, is_primary, type) VALUES (v_pg_id, 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?q=80&w=1200&auto=format&fit=crop', 'Clean Bed Room', true, 'room') ON CONFLICT DO NOTHING;
  INSERT INTO public.sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES (v_pg_id, 1, 16000, 4, 1), (v_pg_id, 2, 11000, 4, 1), (v_pg_id, 3, 8000, 4, 1) ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;
  INSERT INTO public.beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES (v_pg_id, '201', 'Bed A', 'single', 16000, 'available', 2, true, true) ON CONFLICT DO NOTHING;

  v_pg_id := 'b1111111-1111-4111-a111-111111111109';
  INSERT INTO public.pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_3, 'Baner Comfort Stays', 'Modern PG building on Baner Road. Close to cafes, restaurants, and IT offices along highway.', 'Baner High Street, Baner', 'Pune', 'Baner', 18.5590, 73.7868, 'boys', 'approved', 10, 8, 8500, 17000, 15000, true, true, true, true, true, true, 'Regular pest control included.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';
  INSERT INTO public.pg_photos (pg_id, url, caption, is_primary, type) VALUES (v_pg_id, 'https://images.unsplash.com/photo-1540518614846-7eded433c457?q=80&w=1200&auto=format&fit=crop', 'Master Bedroom', true, 'room') ON CONFLICT DO NOTHING;
  INSERT INTO public.sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES (v_pg_id, 1, 17000, 2, 0), (v_pg_id, 2, 11500, 4, 1), (v_pg_id, 3, 8500, 4, 1) ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;
  INSERT INTO public.beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES (v_pg_id, '101', 'Bed A', 'single', 17000, 'available', 1, true, true) ON CONFLICT DO NOTHING;

  -- Delhi PGs
  v_pg_id := 'b1111111-1111-4111-a111-111111111110';
  INSERT INTO public.pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_4, 'North Campus Student Residency', 'Top student PG near Hansraj, SRCC, and Kirori Mal College. Includes study lamps and WiFi.', 'Kamla Nagar, Near DU North Campus', 'Delhi', 'Kamla Nagar', 28.6800, 77.2050, 'co-ed', 'approved', 16, 12, 9000, 18000, 12000, true, true, true, false, true, true, 'Quiet study atmosphere.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';
  INSERT INTO public.pg_photos (pg_id, url, caption, is_primary, type) VALUES (v_pg_id, 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1200&auto=format&fit=crop', 'Student Study Room', true, 'room') ON CONFLICT DO NOTHING;
  INSERT INTO public.sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES (v_pg_id, 1, 18000, 4, 1), (v_pg_id, 2, 12000, 6, 2), (v_pg_id, 3, 9000, 6, 1) ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;
  INSERT INTO public.beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES (v_pg_id, '101', 'Bed A', 'single', 18000, 'available', 1, true, true) ON CONFLICT DO NOTHING;

  v_pg_id := 'b1111111-1111-4111-a111-111111111111';
  INSERT INTO public.pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_4, 'South Ex Premium Executive PG', 'Luxury stay in South Extension 2 near Metro Station. Air conditioned rooms with balcony.', 'Part 2, South Extension', 'Delhi', 'South Extension', 28.5684, 77.2217, 'co-ed', 'approved', 10, 7, 13000, 25000, 20000, true, true, true, true, true, true, 'Proper KYC required.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';
  INSERT INTO public.pg_photos (pg_id, url, caption, is_primary, type) VALUES (v_pg_id, 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=1200&auto=format&fit=crop', 'Luxury Balcony Suite', true, 'room') ON CONFLICT DO NOTHING;
  INSERT INTO public.sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES (v_pg_id, 1, 25000, 2, 1), (v_pg_id, 2, 17000, 4, 1), (v_pg_id, 3, 13000, 4, 1) ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;
  INSERT INTO public.beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES (v_pg_id, '201', 'Bed A', 'single', 25000, 'available', 2, true, true) ON CONFLICT DO NOTHING;

  v_pg_id := 'b1111111-1111-4111-a111-111111111112';
  INSERT INTO public.pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_4, 'Saket Metro View Girls PG', '2 mins walk from Saket Metro station & Select CITYWALK mall. 24x7 guard, female warden.', 'Block J, Saket', 'Delhi', 'Saket', 28.5246, 77.2066, 'girls', 'approved', 8, 5, 11000, 22000, 18000, true, true, true, true, true, true, 'Warden available round clock.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';
  INSERT INTO public.pg_photos (pg_id, url, caption, is_primary, type) VALUES (v_pg_id, 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?q=80&w=1200&auto=format&fit=crop', 'Cosy Twin Bedroom', true, 'room') ON CONFLICT DO NOTHING;
  INSERT INTO public.sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES (v_pg_id, 1, 22000, 2, 1), (v_pg_id, 2, 15000, 4, 1), (v_pg_id, 3, 11000, 2, 1) ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;
  INSERT INTO public.beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES (v_pg_id, '301', 'Bed A', 'single', 22000, 'available', 3, true, true) ON CONFLICT DO NOTHING;

  -- Hyderabad PGs
  v_pg_id := 'b1111111-1111-4111-a111-111111111113';
  INSERT INTO public.pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_5, 'Hitec City Luxury Coliving', 'Situated right in Madhapur/Hitec City near Cyber Towers. Authentic Hyderabadi food & high speed wifi.', 'Near Cyber Towers, Madhapur, Hitec City', 'Hyderabad', 'Hitec City', 17.4504, 78.3808, 'co-ed', 'approved', 14, 11, 8500, 17000, 12000, true, true, true, true, true, true, 'Clean environment.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';
  INSERT INTO public.pg_photos (pg_id, url, caption, is_primary, type) VALUES (v_pg_id, 'https://images.unsplash.com/photo-1567496898669-ee935f5f647a?q=80&w=1200&auto=format&fit=crop', 'Modern Interior', true, 'room') ON CONFLICT DO NOTHING;
  INSERT INTO public.sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES (v_pg_id, 1, 17000, 4, 1), (v_pg_id, 2, 11500, 6, 1), (v_pg_id, 3, 8500, 4, 1) ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;
  INSERT INTO public.beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES (v_pg_id, '101', 'Bed A', 'single', 17000, 'available', 1, true, true) ON CONFLICT DO NOTHING;

  v_pg_id := 'b1111111-1111-4111-a111-111111111114';
  INSERT INTO public.pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_5, 'Gachibowli Executive Stay', 'Walking distance to Financial District, Microsoft, Wipro, and Amazon offices.', 'Near DLF Cyber City, Gachibowli', 'Hyderabad', 'Gachibowli', 17.4401, 78.3489, 'boys', 'approved', 12, 9, 8000, 16000, 10000, true, true, true, true, true, true, 'Quiet environment.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';
  INSERT INTO public.pg_photos (pg_id, url, caption, is_primary, type) VALUES (v_pg_id, 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?q=80&w=1200&auto=format&fit=crop', 'Executive Room', true, 'room') ON CONFLICT DO NOTHING;
  INSERT INTO public.sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES (v_pg_id, 1, 16000, 3, 1), (v_pg_id, 2, 11000, 5, 1), (v_pg_id, 3, 8000, 4, 1) ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;
  INSERT INTO public.beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES (v_pg_id, '201', 'Bed A', 'single', 16000, 'available', 2, true, true) ON CONFLICT DO NOTHING;

  v_pg_id := 'b1111111-1111-4111-a111-111111111115';
  INSERT INTO public.pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_5, 'Jubilee Hills Womens Residency', 'Upscale womens PG in posh Jubilee Hills neighborhood. High security, organic meals.', 'Road No. 36, Jubilee Hills', 'Hyderabad', 'Jubilee Hills', 17.4319, 78.4072, 'girls', 'approved', 8, 6, 10000, 20000, 18000, true, true, true, true, true, true, 'Safety prioritized.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';
  INSERT INTO public.pg_photos (pg_id, url, caption, is_primary, type) VALUES (v_pg_id, 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?q=80&w=1200&auto=format&fit=crop', 'Deluxe Room View', true, 'room') ON CONFLICT DO NOTHING;
  INSERT INTO public.sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES (v_pg_id, 1, 20000, 2, 0), (v_pg_id, 2, 14000, 4, 1), (v_pg_id, 3, 10000, 2, 1) ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;
  INSERT INTO public.beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES (v_pg_id, '101', 'Bed A', 'single', 20000, 'available', 1, true, true) ON CONFLICT DO NOTHING;

  -- Chennai PGs
  v_pg_id := 'b1111111-1111-4111-a111-111111111116';
  INSERT INTO public.pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_6, 'OMR IT Corridor Coliving', 'Located on Old Mahabalipuram Road near RMZ Millenia. Authentic food.', 'Thoraipakkam, OMR', 'Chennai', 'OMR', 12.9416, 80.2362, 'co-ed', 'approved', 12, 10, 7500, 15000, 10000, true, true, true, true, true, true, 'Power backup.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';
  INSERT INTO public.pg_photos (pg_id, url, caption, is_primary, type) VALUES (v_pg_id, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1200&auto=format&fit=crop', 'Comfort Room', true, 'room') ON CONFLICT DO NOTHING;
  INSERT INTO public.sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES (v_pg_id, 1, 15000, 3, 0), (v_pg_id, 2, 10000, 5, 1), (v_pg_id, 3, 7500, 4, 1) ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;
  INSERT INTO public.beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES (v_pg_id, '101', 'Bed A', 'single', 15000, 'available', 1, true, true) ON CONFLICT DO NOTHING;

  v_pg_id := 'b1111111-1111-4111-a111-111111111117';
  INSERT INTO public.pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_6, 'Velachery Executive PG', '5 mins from Phoenix Marketcity Chennai and Velachery Railway Station.', '100 Feet Bypass Road, Velachery', 'Chennai', 'Velachery', 12.9754, 80.2207, 'boys', 'approved', 10, 8, 8000, 16000, 12000, true, true, true, true, true, true, 'RO drinking water.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';
  INSERT INTO public.pg_photos (pg_id, url, caption, is_primary, type) VALUES (v_pg_id, 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=1200&auto=format&fit=crop', 'Twin Room', true, 'room') ON CONFLICT DO NOTHING;
  INSERT INTO public.sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES (v_pg_id, 1, 16000, 2, 0), (v_pg_id, 2, 11000, 4, 1), (v_pg_id, 3, 8000, 4, 1) ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;
  INSERT INTO public.beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES (v_pg_id, '201', 'Bed A', 'single', 16000, 'available', 2, true, true) ON CONFLICT DO NOTHING;

  v_pg_id := 'b1111111-1111-4111-a111-111111111118';
  INSERT INTO public.pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_6, 'T Nagar Ladies Stay', 'Safe womens stay near Pondy Bazaar shopping hub & Usman Road.', 'Burkit Road, T Nagar', 'Chennai', 'T Nagar', 13.0418, 80.2341, 'girls', 'approved', 8, 6, 9000, 18000, 15000, true, true, true, true, true, true, 'Safety first.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';
  INSERT INTO public.pg_photos (pg_id, url, caption, is_primary, type) VALUES (v_pg_id, 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=1200&auto=format&fit=crop', 'Room View', true, 'room') ON CONFLICT DO NOTHING;
  INSERT INTO public.sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES (v_pg_id, 1, 18000, 2, 0), (v_pg_id, 2, 13000, 4, 1), (v_pg_id, 3, 9000, 2, 1) ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;
  INSERT INTO public.beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES (v_pg_id, '101', 'Bed A', 'single', 18000, 'available', 1, true, true) ON CONFLICT DO NOTHING;

  -- Noida PGs
  v_pg_id := 'b1111111-1111-4111-a111-111111111119';
  INSERT INTO public.pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_7, 'Sector 62 IT Hub Coliving', 'Walking distance to Stellar IT Park, Logix Cyber Park, and Sector 62 Metro.', 'Block B, Sector 62', 'Noida', 'Sector 62', 28.6275, 77.3670, 'co-ed', 'approved', 14, 11, 7500, 15000, 10000, true, true, true, true, true, true, 'Clean atmosphere.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';
  INSERT INTO public.pg_photos (pg_id, url, caption, is_primary, type) VALUES (v_pg_id, 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?q=80&w=1200&auto=format&fit=crop', 'Comfort AC Room', true, 'room') ON CONFLICT DO NOTHING;
  INSERT INTO public.sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES (v_pg_id, 1, 15000, 4, 1), (v_pg_id, 2, 10000, 6, 1), (v_pg_id, 3, 7500, 4, 1) ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;
  INSERT INTO public.beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES (v_pg_id, '101', 'Bed A', 'single', 15000, 'available', 1, true, true) ON CONFLICT DO NOTHING;

  v_pg_id := 'b1111111-1111-4111-a111-111111111120';
  INSERT INTO public.pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_7, 'Sector 18 Wave Mall Stay', 'Right next to Sector 18 Metro & Mall of India.', 'Sector 18, Near Wave Mall', 'Noida', 'Sector 18', 28.5708, 77.3261, 'boys', 'approved', 10, 8, 8500, 17000, 12000, true, true, true, true, true, true, 'Close to metro.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';
  INSERT INTO public.pg_photos (pg_id, url, caption, is_primary, type) VALUES (v_pg_id, 'https://images.unsplash.com/photo-1540518614846-7eded433c457?q=80&w=1200&auto=format&fit=crop', 'Master Bedroom', true, 'room') ON CONFLICT DO NOTHING;
  INSERT INTO public.sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES (v_pg_id, 1, 17000, 2, 0), (v_pg_id, 2, 11500, 4, 1), (v_pg_id, 3, 8500, 4, 1) ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;
  INSERT INTO public.beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES (v_pg_id, '201', 'Bed A', 'single', 17000, 'available', 2, true, true) ON CONFLICT DO NOTHING;

  v_pg_id := 'b1111111-1111-4111-a111-111111111121';
  INSERT INTO public.pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_7, 'Knowledge Park Student PG', 'Ideal stay for college students near Amity University.', 'Sector 125, Near Amity University', 'Noida', 'Sector 125', 28.5445, 77.3330, 'co-ed', 'approved', 16, 13, 7000, 14000, 10000, true, true, true, true, true, true, 'Student study desks.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';
  INSERT INTO public.pg_photos (pg_id, url, caption, is_primary, type) VALUES (v_pg_id, 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1200&auto=format&fit=crop', 'Study Desks Room', true, 'room') ON CONFLICT DO NOTHING;
  INSERT INTO public.sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES (v_pg_id, 1, 14000, 4, 1), (v_pg_id, 2, 9500, 6, 1), (v_pg_id, 3, 7000, 6, 1) ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;
  INSERT INTO public.beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES (v_pg_id, '101', 'Bed A', 'single', 14000, 'available', 1, true, true) ON CONFLICT DO NOTHING;

  -- Gurgaon PGs
  v_pg_id := 'b1111111-1111-4111-a111-111111111122';
  INSERT INTO public.pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_8, 'Cyber City Premium Coliving', '5 mins from DLF Cyber Hub & Rapid Metro. Luxury living spaces.', 'DLF Phase 2, Near Cyber Hub', 'Gurgaon', 'DLF Phase 2', 28.4907, 77.0898, 'co-ed', 'approved', 14, 11, 11000, 24000, 20000, true, true, true, true, true, true, 'Top tier amenities.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';
  INSERT INTO public.pg_photos (pg_id, url, caption, is_primary, type) VALUES (v_pg_id, 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=1200&auto=format&fit=crop', 'Cyber Hub Luxury Room', true, 'room') ON CONFLICT DO NOTHING;
  INSERT INTO public.sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES (v_pg_id, 1, 24000, 4, 1), (v_pg_id, 2, 16000, 6, 1), (v_pg_id, 3, 11000, 4, 1) ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;
  INSERT INTO public.beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES (v_pg_id, '101', 'Bed A', 'single', 24000, 'available', 1, true, true) ON CONFLICT DO NOTHING;

  v_pg_id := 'b1111111-1111-4111-a111-111111111123';
  INSERT INTO public.pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_8, 'Golf Course Road Executive PG', 'Premium stay on Golf Course Road. Close to One Horizon Center.', 'Sector 43, Golf Course Road', 'Gurgaon', 'Golf Course Road', 28.4485, 77.0945, 'boys', 'approved', 10, 8, 12000, 26000, 25000, true, true, true, true, true, true, 'Balcony rooms.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';
  INSERT INTO public.pg_photos (pg_id, url, caption, is_primary, type) VALUES (v_pg_id, 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=1200&auto=format&fit=crop', 'Executive Balcony Room', true, 'room') ON CONFLICT DO NOTHING;
  INSERT INTO public.sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES (v_pg_id, 1, 26000, 2, 0), (v_pg_id, 2, 17000, 4, 1), (v_pg_id, 3, 12000, 4, 1) ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;
  INSERT INTO public.beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES (v_pg_id, '201', 'Bed A', 'single', 26000, 'available', 2, true, true) ON CONFLICT DO NOTHING;

  v_pg_id := 'b1111111-1111-4111-a111-111111111124';
  INSERT INTO public.pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_8, 'Sohna Road Co-Living Stay', 'Located near Subhash Chowk & Spaze iTech Park.', 'Sector 48, Sohna Road', 'Gurgaon', 'Sohna Road', 28.4190, 77.0385, 'co-ed', 'approved', 12, 10, 9000, 18000, 15000, true, true, true, true, true, true, 'Quiet surroundings.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';
  INSERT INTO public.pg_photos (pg_id, url, caption, is_primary, type) VALUES (v_pg_id, 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?q=80&w=1200&auto=format&fit=crop', 'Spacious Room', true, 'room') ON CONFLICT DO NOTHING;
  INSERT INTO public.sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES (v_pg_id, 1, 18000, 4, 1), (v_pg_id, 2, 12500, 4, 1), (v_pg_id, 3, 9000, 4, 0) ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;
  INSERT INTO public.beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES (v_pg_id, '101', 'Bed A', 'single', 18000, 'available', 1, true, true) ON CONFLICT DO NOTHING;

  -- Insert initial reviews for seeded PGs
  INSERT INTO public.reviews (user_id, pg_id, rating, comment)
  SELECT v_owner_1, id, 4 + (random() * 1)::integer, 'Great property! Very clean, excellent food quality and supportive staff.'
  FROM public.pg_listings ON CONFLICT (user_id, pg_id) DO NOTHING;
END $$;