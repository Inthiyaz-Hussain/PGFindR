-- =========================================================================
-- SQL Script to clean up dummy PGs/Owners and set up exactly 1 Bangalore PG and 1 Admin
-- Copy and execute this in your Supabase SQL Editor
-- =========================================================================

-- 1. DELETE DUMMY DATA (Order respects foreign key constraints)
DELETE FROM public.reviews;
DELETE FROM public.bookings;
DELETE FROM public.inquiries;
DELETE FROM public.payments;
DELETE FROM public.beds;
DELETE FROM public.sharing_types;
DELETE FROM public.pg_photos;
DELETE FROM public.amenities;
DELETE FROM public.owner_documents;
DELETE FROM public.owner_kyc;
DELETE FROM public.pg_listings;

-- Delete all profiles except the main demo owner and demo admin
DELETE FROM public.profiles WHERE id NOT IN ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003');

-- Delete all auth users except the main demo owner and demo admin
DELETE FROM auth.users WHERE id NOT IN ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003');

-- 2. SEED AUTH USERS FIRST (to satisfy profiles foreign key constraint)
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token
) VALUES
  (
    '00000000-0000-0000-0000-000000000000', 
    '00000000-0000-0000-0000-000000000002', 
    'authenticated', 
    'authenticated', 
    'owner@findpgroom.demo', 
    crypt('Owner@123', gen_salt('bf')), 
    now(), 
    '{"provider":"email","providers":["email"]}'::jsonb, 
    '{"full_name":"Rajesh Sharma (Bangalore Owner)","role":"owner"}'::jsonb, 
    now(), 
    now(), 
    '', 
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000', 
    '00000000-0000-0000-0000-000000000003', 
    'authenticated', 
    'authenticated', 
    'admin@findpgroom.demo', 
    crypt('Admin@123', gen_salt('bf')), 
    now(), 
    '{"provider":"email","providers":["email"]}'::jsonb, 
    '{"full_name":"Super Admin","role":"admin"}'::jsonb, 
    now(), 
    now(), 
    '', 
    ''
  )
ON CONFLICT (id) DO NOTHING;

-- 3. SEED PROFILE RECORDS (Auto-inserted via triggers, but upsert explicitly here to ensure role mapping)
INSERT INTO public.profiles (id, full_name, phone, role) 
VALUES 
  ('00000000-0000-0000-0000-000000000002', 'Rajesh Sharma (Bangalore Owner)', '+91 9876543210', 'owner'),
  ('00000000-0000-0000-0000-000000000003', 'Super Admin', '+91 9999999999', 'admin')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, full_name = EXCLUDED.full_name, phone = EXCLUDED.phone;

-- Seed Owner KYC records
INSERT INTO public.owner_kyc (owner_id, pan_number, aadhaar_number, bank_account, bank_ifsc, bank_name, status)
VALUES ('00000000-0000-0000-0000-000000000002', 'ABCDE1234F', '123456789012', '91827364501', 'SBIN0001234', 'State Bank of India', 'approved')
ON CONFLICT (owner_id) DO UPDATE SET status = 'approved';

-- 4. SEED ONE PG IN BANGALORE
INSERT INTO public.pg_listings (
  id, 
  owner_id, 
  name, 
  description, 
  address, 
  city, 
  locality, 
  latitude, 
  longitude, 
  pg_type, 
  status, 
  total_beds, 
  available_beds, 
  monthly_rent_min, 
  monthly_rent_max, 
  deposit_amount, 
  food_included, 
  wifi_included, 
  ac_rooms, 
  parking, 
  laundry, 
  security_24x7, 
  rules
) VALUES (
  'b1111111-1111-4111-a111-111111111101', 
  '00000000-0000-0000-0000-000000000002', 
  'Starlight Premium Coliving', 
  'Modern luxury PG located in the heart of Koramangala near Sony World Signal. Fully furnished with high-speed WiFi, daily housekeeping, and delicious meals.', 
  'No. 45, 5th Block, 80 Feet Road, Koramangala', 
  'Bangalore', 
  'Koramangala', 
  12.935242, 
  77.624462, 
  'co-ed', 
  'approved', 
  4, 
  4, 
  12500, 
  18000, 
  15000, 
  true, 
  true, 
  true, 
  true, 
  true, 
  true, 
  'No smoking inside rooms. Visitors allowed till 9 PM.'
) ON CONFLICT (id) DO UPDATE SET status = 'approved';

-- Seed Photos for PG
INSERT INTO public.pg_photos (pg_id, url, caption, is_primary, type) VALUES
  ('b1111111-1111-4111-a111-111111111101', 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=1200&auto=format&fit=crop', 'Building Exterior', true, 'exterior'),
  ('b1111111-1111-4111-a111-111111111101', 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?q=80&w=1200&auto=format&fit=crop', 'Spacious Single AC Room', false, 'room')
ON CONFLICT DO NOTHING;

-- Seed Sharing Types for PG
INSERT INTO public.sharing_types (pg_id, type, price_monthly, price_daily, total_beds, occupied_beds) VALUES
  ('b1111111-1111-4111-a111-111111111101', 1, 18000, null, 2, 0),
  ('b1111111-1111-4111-a111-111111111101', 2, 12500, null, 2, 0)
ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;

-- Seed Beds for PG
INSERT INTO public.beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES
  ('b1111111-1111-4111-a111-111111111101', '101', 'Bed 1', 'single', 18000, 'available', 1, true, true),
  ('b1111111-1111-4111-a111-111111111101', '101', 'Bed 2', 'single', 18000, 'available', 1, true, true),
  ('b1111111-1111-4111-a111-111111111101', '102', 'Bed 1', 'double', 12500, 'available', 1, true, true),
  ('b1111111-1111-4111-a111-111111111101', '102', 'Bed 2', 'double', 12500, 'available', 1, true, true)
ON CONFLICT DO NOTHING;
