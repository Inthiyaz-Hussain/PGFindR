-- 1. ADD GOOGLE AUTH COLUMNS TO PROFILES
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS google_uid TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS google_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS google_verified_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_verified_at TIMESTAMPTZ;

-- 2. CREATE ROOMS TABLE
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_id UUID REFERENCES public.pg_listings(id) ON DELETE CASCADE NOT NULL,
  sharing_type_id UUID REFERENCES public.sharing_types(id) ON DELETE CASCADE NOT NULL,
  room_label VARCHAR(100) NOT NULL,
  floor INTEGER NOT NULL,
  door_facing VARCHAR(5) NOT NULL CHECK (door_facing IN ('N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW')),
  has_window BOOLEAN NOT NULL DEFAULT false,
  window_facing VARCHAR(5) CHECK (window_facing IN ('N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW')),
  window_count INTEGER,
  room_size_sqft INTEGER,
  room_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CREATE CUSTOM AMENITIES TABLE
CREATE TABLE IF NOT EXISTS public.custom_amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_id UUID REFERENCES public.pg_listings(id) ON DELETE CASCADE NOT NULL,
  label VARCHAR(50) NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ALTER BEDS TABLE TO ADD NEW GRANULAR BED DATA
ALTER TABLE public.beds ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE;
ALTER TABLE public.beds ADD COLUMN IF NOT EXISTS bed_type VARCHAR(30) DEFAULT 'Single';
ALTER TABLE public.beds ADD COLUMN IF NOT EXISTS occupied_by_booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL;
ALTER TABLE public.beds ADD COLUMN IF NOT EXISTS occupied_since DATE;
ALTER TABLE public.beds ADD COLUMN IF NOT EXISTS expected_vacate DATE;

-- 5. MIGRATE EXISTING BED DATA INTO THE ROOMS TABLE
-- First, ensure every distinct (pg_id, room_number) has a room created
INSERT INTO public.rooms (pg_id, sharing_type_id, room_label, floor, door_facing, has_window)
SELECT DISTINCT ON (b.pg_id, b.room_number)
  b.pg_id,
  COALESCE(s.id, (SELECT id FROM public.sharing_types WHERE pg_id = b.pg_id LIMIT 1)) as sharing_type_id,
  b.room_number,
  COALESCE(b.floor_number, 1),
  'N' as door_facing,
  false as has_window
FROM public.beds b
LEFT JOIN public.sharing_types s ON s.pg_id = b.pg_id AND s.type = (
  CASE
    WHEN b.sharing_type = 'single' THEN 1
    WHEN b.sharing_type = 'double' THEN 2
    WHEN b.sharing_type = 'triple' THEN 3
    ELSE 4
  END
)
WHERE b.room_id IS NULL;

-- Second, link the beds to their room_id
UPDATE public.beds b
SET room_id = r.id
FROM public.rooms r
WHERE r.pg_id = b.pg_id AND r.room_label = b.room_number AND b.room_id IS NULL;

-- 6. RLS POLICIES FOR NEW TABLES
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_amenities ENABLE ROW LEVEL SECURITY;

-- Rooms policies
DROP POLICY IF EXISTS "select_rooms" ON public.rooms;
CREATE POLICY "select_rooms" ON public.rooms FOR SELECT USING (true);

DROP POLICY IF EXISTS "insert_rooms" ON public.rooms;
CREATE POLICY "insert_rooms" ON public.rooms FOR INSERT TO authenticated 
WITH CHECK (EXISTS (SELECT 1 FROM public.pg_listings WHERE id = pg_id AND owner_id = auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS "update_rooms" ON public.rooms;
CREATE POLICY "update_rooms" ON public.rooms FOR UPDATE TO authenticated 
USING (EXISTS (SELECT 1 FROM public.pg_listings WHERE id = pg_id AND owner_id = auth.uid()) OR public.is_admin())
WITH CHECK (EXISTS (SELECT 1 FROM public.pg_listings WHERE id = pg_id AND owner_id = auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS "delete_rooms" ON public.rooms;
CREATE POLICY "delete_rooms" ON public.rooms FOR DELETE TO authenticated 
USING (EXISTS (SELECT 1 FROM public.pg_listings WHERE id = pg_id AND owner_id = auth.uid()) OR public.is_admin());

-- Custom amenities policies
DROP POLICY IF EXISTS "select_custom_amenities" ON public.custom_amenities;
CREATE POLICY "select_custom_amenities" ON public.custom_amenities FOR SELECT USING (true);

DROP POLICY IF EXISTS "insert_custom_amenities" ON public.custom_amenities;
CREATE POLICY "insert_custom_amenities" ON public.custom_amenities FOR INSERT TO authenticated 
WITH CHECK (EXISTS (SELECT 1 FROM public.pg_listings WHERE id = pg_id AND owner_id = auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS "update_custom_amenities" ON public.custom_amenities;
CREATE POLICY "update_custom_amenities" ON public.custom_amenities FOR UPDATE TO authenticated 
USING (EXISTS (SELECT 1 FROM public.pg_listings WHERE id = pg_id AND owner_id = auth.uid()) OR public.is_admin())
WITH CHECK (EXISTS (SELECT 1 FROM public.pg_listings WHERE id = pg_id AND owner_id = auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS "delete_custom_amenities" ON public.custom_amenities;
CREATE POLICY "delete_custom_amenities" ON public.custom_amenities FOR DELETE TO authenticated 
USING (EXISTS (SELECT 1 FROM public.pg_listings WHERE id = pg_id AND owner_id = auth.uid()) OR public.is_admin());

-- 7. ADD TO SUPABASE REALTIME REPLICATION
-- We check if tables are already in publication, if not we add them. 
-- In PG, publication tables can be added using ADD TABLE.
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_amenities;
