
-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'seeker' CHECK (role IN ('seeker', 'owner', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- Allow users to read other profiles (needed for owner/admin lookups)
CREATE POLICY "select_all_profiles" ON profiles FOR SELECT TO authenticated USING (true);

-- PG Listings
CREATE TABLE pg_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id) NOT NULL,
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

ALTER TABLE pg_listings ENABLE ROW LEVEL SECURITY;

-- Anyone can view approved listings
CREATE POLICY "select_approved_listings" ON pg_listings FOR SELECT USING (status = 'approved');
-- Owners see their own listings
CREATE POLICY "select_own_listings" ON pg_listings FOR SELECT TO authenticated USING (auth.uid() = owner_id);
-- Admins see all (we'll handle via service role or RLS bypass in edge function)
CREATE POLICY "insert_own_listings" ON pg_listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "update_own_listings" ON pg_listings FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "delete_own_listings" ON pg_listings FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- Beds
CREATE TABLE beds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_id UUID REFERENCES pg_listings(id) ON DELETE CASCADE NOT NULL,
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

ALTER TABLE beds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_beds" ON beds FOR SELECT USING (true);
CREATE POLICY "insert_beds" ON beds FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM pg_listings WHERE id = pg_id AND owner_id = auth.uid())
);
CREATE POLICY "update_beds" ON beds FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM pg_listings WHERE id = pg_id AND owner_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM pg_listings WHERE id = pg_id AND owner_id = auth.uid())
);
CREATE POLICY "delete_beds" ON beds FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM pg_listings WHERE id = pg_id AND owner_id = auth.uid())
);

-- PG Photos
CREATE TABLE pg_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_id UUID REFERENCES pg_listings(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  caption TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pg_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_photos" ON pg_photos FOR SELECT USING (true);
CREATE POLICY "insert_photos" ON pg_photos FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM pg_listings WHERE id = pg_id AND owner_id = auth.uid())
);
CREATE POLICY "update_photos" ON pg_photos FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM pg_listings WHERE id = pg_id AND owner_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM pg_listings WHERE id = pg_id AND owner_id = auth.uid())
);
CREATE POLICY "delete_photos" ON pg_photos FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM pg_listings WHERE id = pg_id AND owner_id = auth.uid())
);

-- Inquiries
CREATE TABLE inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_id UUID REFERENCES pg_listings(id) NOT NULL,
  seeker_id UUID REFERENCES profiles(id) NOT NULL,
  bed_id UUID REFERENCES beds(id),
  message TEXT,
  move_in_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'confirmed', 'cancelled')),
  owner_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_inquiries_seeker" ON inquiries FOR SELECT TO authenticated USING (auth.uid() = seeker_id);
CREATE POLICY "select_own_inquiries_owner" ON inquiries FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM pg_listings WHERE id = pg_id AND owner_id = auth.uid())
);
CREATE POLICY "insert_inquiries" ON inquiries FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "update_inquiries_seeker" ON inquiries FOR UPDATE TO authenticated USING (auth.uid() = seeker_id) WITH CHECK (auth.uid() = seeker_id);
CREATE POLICY "update_inquiries_owner" ON inquiries FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM pg_listings WHERE id = pg_id AND owner_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM pg_listings WHERE id = pg_id AND owner_id = auth.uid())
);
CREATE POLICY "delete_inquiries" ON inquiries FOR DELETE TO authenticated USING (auth.uid() = seeker_id);

-- Bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID REFERENCES inquiries(id),
  pg_id UUID REFERENCES pg_listings(id) NOT NULL,
  seeker_id UUID REFERENCES profiles(id) NOT NULL,
  owner_id UUID REFERENCES profiles(id) NOT NULL,
  bed_id UUID REFERENCES beds(id) NOT NULL,
  monthly_rent INTEGER NOT NULL,
  deposit_amount INTEGER NOT NULL DEFAULT 0,
  move_in_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'payment_done', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_bookings_seeker" ON bookings FOR SELECT TO authenticated USING (auth.uid() = seeker_id);
CREATE POLICY "select_bookings_owner" ON bookings FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "insert_bookings" ON bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = seeker_id);
CREATE POLICY "update_bookings_seeker" ON bookings FOR UPDATE TO authenticated USING (auth.uid() = seeker_id) WITH CHECK (auth.uid() = seeker_id);
CREATE POLICY "update_bookings_owner" ON bookings FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "delete_bookings" ON bookings FOR DELETE TO authenticated USING (auth.uid() = seeker_id);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) NOT NULL,
  seeker_id UUID REFERENCES profiles(id) NOT NULL,
  amount INTEGER NOT NULL,
  commission_rate DECIMAL(5,2) DEFAULT 10.00,
  commission_amount INTEGER NOT NULL DEFAULT 0,
  owner_payout INTEGER NOT NULL DEFAULT 0,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_type TEXT NOT NULL DEFAULT 'deposit' CHECK (payment_type IN ('deposit', 'monthly_rent')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_payments_seeker" ON payments FOR SELECT TO authenticated USING (auth.uid() = seeker_id);
CREATE POLICY "select_payments_owner" ON payments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM bookings WHERE id = booking_id AND owner_id = auth.uid())
);
CREATE POLICY "insert_payments" ON payments FOR INSERT TO authenticated WITH CHECK (auth.uid() = seeker_id);
CREATE POLICY "update_payments" ON payments FOR UPDATE TO authenticated USING (auth.uid() = seeker_id) WITH CHECK (auth.uid() = seeker_id);
CREATE POLICY "delete_payments" ON payments FOR DELETE TO authenticated USING (auth.uid() = seeker_id);

-- Owner KYC
CREATE TABLE owner_kyc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id) UNIQUE NOT NULL,
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

ALTER TABLE owner_kyc ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_kyc" ON owner_kyc FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "insert_own_kyc" ON owner_kyc FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "update_own_kyc" ON owner_kyc FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "delete_own_kyc" ON owner_kyc FOR DELETE TO authenticated USING (auth.uid() = owner_id);

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

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update available_beds count
CREATE OR REPLACE FUNCTION update_pg_bed_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE pg_listings
  SET 
    total_beds = (SELECT COUNT(*) FROM beds WHERE pg_id = COALESCE(NEW.pg_id, OLD.pg_id)),
    available_beds = (SELECT COUNT(*) FROM beds WHERE pg_id = COALESCE(NEW.pg_id, OLD.pg_id) AND status = 'available'),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.pg_id, OLD.pg_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER beds_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON beds
  FOR EACH ROW EXECUTE FUNCTION update_pg_bed_counts();

-- Enable Realtime for beds and pg_listings
ALTER PUBLICATION supabase_realtime ADD TABLE beds;
ALTER PUBLICATION supabase_realtime ADD TABLE pg_listings;
ALTER PUBLICATION supabase_realtime ADD TABLE inquiries;
