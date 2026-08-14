-- Create owner_inquiries table
CREATE TABLE IF NOT EXISTS public.owner_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(100) NOT NULL,
  mobile VARCHAR(15) NOT NULL,
  email VARCHAR(200) NOT NULL,
  google_uid VARCHAR(200),
  pg_name VARCHAR(200) NOT NULL,
  pg_city VARCHAR(100) NOT NULL,
  pg_address TEXT NOT NULL,
  room_count INTEGER NOT NULL,
  bed_count INTEGER NOT NULL,
  referral_source VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending_admin_review' CHECK (status IN ('pending_admin_review', 'approved', 'rejected', 'password_sent', 'onboarded')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id),
  reset_token VARCHAR(128),
  reset_token_expires_at TIMESTAMPTZ,
  reset_token_used BOOLEAN DEFAULT false,
  password_set_at TIMESTAMPTZ,
  owner_user_id UUID REFERENCES public.profiles(id)
);

-- Enable RLS on owner_inquiries
ALTER TABLE public.owner_inquiries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public insert on owner_inquiries" ON public.owner_inquiries;
DROP POLICY IF EXISTS "Allow admins all access on owner_inquiries" ON public.owner_inquiries;

-- Add RLS Policies
CREATE POLICY "Allow public insert on owner_inquiries" ON public.owner_inquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admins all access on owner_inquiries" ON public.owner_inquiries FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Alter profiles table to add KYC tracking fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(30) DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'submitted', 'approved', 'rejected', 'resubmission_requested'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_submitted_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_reviewed_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_reviewed_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_notes TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(15);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_holder_name VARCHAR(100);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS listing_status VARCHAR(20) DEFAULT 'hidden' CHECK (listing_status IN ('hidden', 'active'));
