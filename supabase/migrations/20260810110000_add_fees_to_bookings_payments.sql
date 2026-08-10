-- Add new payment-related fee columns to bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS platform_fee INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS service_charge INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS include_rent BOOLEAN NOT NULL DEFAULT false;

-- Add new payment-related fee columns to payments table
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS platform_fee INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS service_charge INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS include_rent BOOLEAN NOT NULL DEFAULT false;
