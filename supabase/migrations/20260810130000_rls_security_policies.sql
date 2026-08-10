-- Enable Row Level Security (RLS)
ALTER TABLE public.pg_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_kyc ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Allow public read-only access to approved listings" ON public.pg_listings;
DROP POLICY IF EXISTS "Allow owners full access to their own listings" ON public.pg_listings;
DROP POLICY IF EXISTS "Allow owners full access to their own KYC docs" ON public.owner_kyc;

-- pg_listings table policies:
-- 1. Unauthenticated users can only read verified (approved) property listings
CREATE POLICY "Allow public read-only access to approved listings"
ON public.pg_listings
FOR SELECT
USING (status = 'approved');

-- 2. Authenticated owners can create, update, and delete their own properties
CREATE POLICY "Allow owners full access to their own listings"
ON public.pg_listings
FOR ALL
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- owner_kyc table policies:
-- 1. Authenticated owners can manage their own private KYC documents
CREATE POLICY "Allow owners full access to their own KYC docs"
ON public.owner_kyc
FOR ALL
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);
