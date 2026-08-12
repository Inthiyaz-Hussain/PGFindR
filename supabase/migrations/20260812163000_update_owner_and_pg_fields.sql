-- Add phone_alternate to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_alternate TEXT;

-- Add new location fields to pg_listings table
ALTER TABLE public.pg_listings ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);
ALTER TABLE public.pg_listings ADD COLUMN IF NOT EXISTS near_malls TEXT;
ALTER TABLE public.pg_listings ADD COLUMN IF NOT EXISTS near_parks TEXT;
ALTER TABLE public.pg_listings ADD COLUMN IF NOT EXISTS near_pubs TEXT;
ALTER TABLE public.pg_listings ADD COLUMN IF NOT EXISTS near_transit TEXT;

-- Update check constraint on pg_type to support 'coliving'
ALTER TABLE public.pg_listings DROP CONSTRAINT IF EXISTS pg_listings_pg_type_check;
ALTER TABLE public.pg_listings ADD CONSTRAINT pg_listings_pg_type_check CHECK (pg_type IN ('boys', 'girls', 'co-ed', 'coliving'));
