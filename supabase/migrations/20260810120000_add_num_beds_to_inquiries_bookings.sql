-- Add num_beds column to inquiries table
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS num_beds INTEGER NOT NULL DEFAULT 1;

-- Add num_beds column to bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS num_beds INTEGER NOT NULL DEFAULT 1;
