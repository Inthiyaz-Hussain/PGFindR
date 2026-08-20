-- 1. Property Media Table (Public CDN assets)
CREATE TABLE IF NOT EXISTS public.property_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.pg_listings(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT CHECK (file_type IN ('image', 'video')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tenant KYC Metadata Table (Private storage keys)
CREATE TABLE IF NOT EXISTS public.tenant_kyc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  r2_storage_key TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.property_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_kyc ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Public property media view" ON public.property_media;
DROP POLICY IF EXISTS "Owner property media modify" ON public.property_media;
DROP POLICY IF EXISTS "Tenant manage own KYC" ON public.tenant_kyc;
DROP POLICY IF EXISTS "Owner/Admin read booked tenant KYC" ON public.tenant_kyc;

-- Property Media: Anyone can view, only verified owners can insert/delete
CREATE POLICY "Public property media view" ON public.property_media
  FOR SELECT USING (true);

CREATE POLICY "Owner property media modify" ON public.property_media
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pg_listings
    WHERE pg_listings.id = property_media.property_id
    AND pg_listings.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.pg_listings
    WHERE pg_listings.id = property_media.property_id
    AND pg_listings.owner_id = auth.uid()
  ));

-- Tenant KYC: Tenant reads/inserts own docs; authorized PG owner/admin reads booked tenant docs
CREATE POLICY "Tenant manage own KYC" ON public.tenant_kyc
  FOR ALL TO authenticated
  USING (auth.uid() = tenant_id)
  WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Owner/Admin read booked tenant KYC" ON public.tenant_kyc
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.seeker_id = tenant_kyc.tenant_id
      AND b.owner_id = auth.uid()
    )
  );

-- Enable Realtime Replication
ALTER PUBLICATION supabase_realtime ADD TABLE public.property_media;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tenant_kyc;
