-- =========================================================================
-- SEED SCRIPT: 3 DUMMY PGs & DUMMY OWNERS FOR EACH LOCATION (24 PGs TOTAL)
-- Locations: Bangalore, Mumbai, Pune, Delhi, Hyderabad, Chennai, Noida, Gurgaon
-- Copy and run this script in your Supabase SQL Editor
-- =========================================================================

DO $$
DECLARE
  -- Owner UUIDs
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

  -- 1. INSERT DUMMY OWNER PROFILES (upsert using ON CONFLICT)
  INSERT INTO profiles (id, full_name, phone, role) VALUES
    (v_owner_1, 'Rajesh Sharma (Bangalore Owner)', '+91 9876543210', 'owner'),
    (v_owner_2, 'Priya Kulkarni (Mumbai Owner)', '+91 9876543211', 'owner'),
    (v_owner_3, 'Vikram Deshmukh (Pune Owner)', '+91 9876543212', 'owner'),
    (v_owner_4, 'Ankit Verma (Delhi Owner)', '+91 9876543213', 'owner'),
    (v_owner_5, 'Srinivas Rao (Hyderabad Owner)', '+91 9876543214', 'owner'),
    (v_owner_6, 'Karthik Subramanian (Chennai Owner)', '+91 9876543215', 'owner'),
    (v_owner_7, 'Sunil Tyagi (Noida Owner)', '+91 9876543216', 'owner'),
    (v_owner_8, 'Rohan Gupta (Gurgaon Owner)', '+91 9876543217', 'owner')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    role = 'owner';

  -- 2. INSERT APPROVED OWNER KYC RECORDS
  INSERT INTO owner_kyc (owner_id, pan_number, aadhaar_number, bank_account, bank_ifsc, bank_name, status) VALUES
    (v_owner_1, 'ABCDE1234F', '123456789012', '91827364501', 'SBIN0001234', 'State Bank of India', 'approved'),
    (v_owner_2, 'BCDEF2345G', '234567890123', '91827364502', 'HDFC0001234', 'HDFC Bank', 'approved'),
    (v_owner_3, 'CDEFG3456H', '345678901234', '91827364503', 'ICIC0001234', 'ICICI Bank', 'approved'),
    (v_owner_4, 'DEFGH4567I', '456789012345', '91827364504', 'UTIB0001234', 'Axis Bank', 'approved'),
    (v_owner_5, 'EFGHI5678J', '567890123456', '91827364505', 'SBIN0005678', 'State Bank of India', 'approved'),
    (v_owner_6, 'FGHIJ6789K', '678901234567', '91827364506', 'HDFC0005678', 'HDFC Bank', 'approved'),
    (v_owner_7, 'GHIJK7890L', '789012345678', '91827364507', 'ICIC0005678', 'ICICI Bank', 'approved'),
    (v_owner_8, 'HIJKL8901M', '890123456789', '91827364508', 'UTIB0005678', 'Axis Bank', 'approved')
  ON CONFLICT (owner_id) DO UPDATE SET status = 'approved';

  -- =========================================================================
  -- 3. BANGALORE PGs (3 listings)
  -- =========================================================================

  -- PG 1: Bangalore - Starlight Premium Coliving (Koramangala)
  v_pg_id := 'b1111111-1111-4111-a111-111111111101';
  INSERT INTO pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_1, 'Starlight Premium Coliving', 'Modern luxury PG located in the heart of Koramangala near Sony World Signal. Fully furnished with high-speed WiFi, daily housekeeping, and delicious meals.', 'No. 45, 5th Block, 80 Feet Road, Koramangala', 'Bangalore', 'Koramangala', 12.9352, 77.6245, 'co-ed', 'approved', 12, 10, 9500, 18000, 15000, true, true, true, true, true, true, 'No smoking inside rooms. Visitors allowed till 9 PM.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';

  INSERT INTO pg_photos (pg_id, url, caption, is_primary, type) VALUES
    (v_pg_id, 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=1200&auto=format&fit=crop', 'Building Exterior', true, 'exterior'),
    (v_pg_id, 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?q=80&w=1200&auto=format&fit=crop', 'Spacious Single AC Room', false, 'room'),
    (v_pg_id, 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=1200&auto=format&fit=crop', 'Modern Washroom', false, 'washroom')
  ON CONFLICT DO NOTHING;

  INSERT INTO sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES
    (v_pg_id, 1, 18000, 4, 1),
    (v_pg_id, 2, 12500, 4, 1),
    (v_pg_id, 3, 9500, 4, 0)
  ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;

  INSERT INTO beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES
    (v_pg_id, '101', 'Bed A', 'single', 18000, 'available', 1, true, true),
    (v_pg_id, '101', 'Bed B', 'single', 18000, 'available', 1, true, true),
    (v_pg_id, '102', 'Bed A', 'double', 12500, 'available', 1, true, true),
    (v_pg_id, '102', 'Bed B', 'double', 12500, 'available', 1, true, true),
    (v_pg_id, '201', 'Bed A', 'triple', 9500, 'available', 2, true, false),
    (v_pg_id, '201', 'Bed B', 'triple', 9500, 'available', 2, true, false)
  ON CONFLICT DO NOTHING;

  -- PG 2: Bangalore - Green View Gents PG (HSR Layout)
  v_pg_id := 'b1111111-1111-4111-a111-111111111102';
  INSERT INTO pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_1, 'Green View Gents Luxury PG', 'Peaceful PG for male working professionals near HSR BDA Complex. High quality South & North Indian food served 3 times a day.', 'Plot 112, Sector 3, HSR Layout', 'Bangalore', 'HSR Layout', 12.9121, 77.6446, 'boys', 'approved', 10, 8, 8500, 15000, 10000, true, true, true, true, true, true, 'Gate closes at 11:30 PM. Alcohol strictly prohibited.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';

  INSERT INTO pg_photos (pg_id, url, caption, is_primary, type) VALUES
    (v_pg_id, 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?q=80&w=1200&auto=format&fit=crop', 'Comfortable Double Bed Room', true, 'room'),
    (v_pg_id, 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=1200&auto=format&fit=crop', 'Common Lounge & Dining', false, 'common')
  ON CONFLICT DO NOTHING;

  INSERT INTO sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES
    (v_pg_id, 1, 15000, 2, 0),
    (v_pg_id, 2, 10500, 4, 1),
    (v_pg_id, 3, 8500, 4, 1)
  ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;

  INSERT INTO beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES
    (v_pg_id, '101', 'Bed A', 'single', 15000, 'available', 1, true, true),
    (v_pg_id, '102', 'Bed A', 'double', 10500, 'available', 1, true, true),
    (v_pg_id, '102', 'Bed B', 'double', 10500, 'available', 1, true, true),
    (v_pg_id, '201', 'Bed A', 'triple', 8500, 'available', 2, false, true)
  ON CONFLICT DO NOTHING;

  -- PG 3: Bangalore - Harmony Ladies PG (Indiranagar)
  v_pg_id := 'b1111111-1111-4111-a111-111111111103';
  INSERT INTO pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_1, 'Harmony Ladies Executive Stay', 'Safe and premium ladies PG right next to 100ft Road Indiranagar and Metro Station. Biometric entry, 24/7 security guard, power backup.', '12th Main, 4th Cross, Indiranagar', 'Bangalore', 'Indiranagar', 12.9784, 77.6408, 'girls', 'approved', 8, 6, 11000, 21000, 20000, true, true, true, true, true, true, 'Strict 24/7 security. Male visitors restricted to reception lobby.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';

  INSERT INTO pg_photos (pg_id, url, caption, is_primary, type) VALUES
    (v_pg_id, 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1200&auto=format&fit=crop', 'Cosy Bedroom Design', true, 'room'),
    (v_pg_id, 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=1200&auto=format&fit=crop', 'Hygienic Kitchen & Pantry', false, 'kitchen')
  ON CONFLICT DO NOTHING;

  INSERT INTO sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES
    (v_pg_id, 1, 21000, 2, 1),
    (v_pg_id, 2, 14000, 4, 1),
    (v_pg_id, 3, 11000, 2, 0)
  ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;

  INSERT INTO beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES
    (v_pg_id, '301', 'Bed A', 'single', 21000, 'available', 3, true, true),
    (v_pg_id, '302', 'Bed A', 'double', 14000, 'available', 3, true, true),
    (v_pg_id, '302', 'Bed B', 'double', 14000, 'available', 3, true, true)
  ON CONFLICT DO NOTHING;

  -- =========================================================================
  -- 4. MUMBAI PGs (3 listings)
  -- =========================================================================

  -- PG 4: Mumbai - Sea Breeze Coliving (Bandra West)
  v_pg_id := 'b1111111-1111-4111-a111-111111111104';
  INSERT INTO pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_2, 'Sea Breeze Luxury Coliving', 'Prime Bandra West location with sea view balcony rooms. Ideal for media, tech, and corporate professionals. Walking distance to Hill Road.', 'Hill Road, Near Elco Market, Bandra West', 'Mumbai', 'Bandra West', 19.0596, 72.8295, 'co-ed', 'approved', 8, 5, 16000, 32000, 30000, true, true, true, false, true, true, 'Quiet hours after 10 PM. Cleanliness maintained daily.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';

  INSERT INTO pg_photos (pg_id, url, caption, is_primary, type) VALUES
    (v_pg_id, 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=1200&auto=format&fit=crop', 'Modern Apartment Suite', true, 'room'),
    (v_pg_id, 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?q=80&w=1200&auto=format&fit=crop', 'Common Living Space', false, 'common')
  ON CONFLICT DO NOTHING;

  INSERT INTO sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES
    (v_pg_id, 1, 32000, 2, 1),
    (v_pg_id, 2, 22000, 4, 1),
    (v_pg_id, 3, 16000, 2, 1)
  ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;

  INSERT INTO beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES
    (v_pg_id, '401', 'Bed A', 'single', 32000, 'available', 4, true, true),
    (v_pg_id, '402', 'Bed A', 'double', 22000, 'available', 4, true, true),
    (v_pg_id, '402', 'Bed B', 'double', 22000, 'available', 4, true, true)
  ON CONFLICT DO NOTHING;

  -- PG 5: Mumbai - Elite Heights Gents Stay (Andheri East)
  v_pg_id := 'b1111111-1111-4111-a111-111111111105';
  INSERT INTO pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_2, 'Elite Heights Gents PG', 'Close to JB Nagar Metro station and SEEPZ IT park. Includes breakfast, dinner, 500Mbps WiFi, and weekly laundry service.', 'Near JB Nagar Metro Station, Andheri East', 'Mumbai', 'Andheri East', 19.1136, 72.8697, 'boys', 'approved', 10, 7, 12000, 24000, 20000, true, true, true, true, true, true, 'ID proof required for all residents.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';

  INSERT INTO pg_photos (pg_id, url, caption, is_primary, type) VALUES
    (v_pg_id, 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?q=80&w=1200&auto=format&fit=crop', 'Comfortable AC Bedroom', true, 'room')
  ON CONFLICT DO NOTHING;

  INSERT INTO sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES
    (v_pg_id, 1, 24000, 2, 0),
    (v_pg_id, 2, 16000, 4, 1),
    (v_pg_id, 3, 12000, 4, 2)
  ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;

  INSERT INTO beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES
    (v_pg_id, '201', 'Bed A', 'single', 24000, 'available', 2, true, true),
    (v_pg_id, '202', 'Bed A', 'double', 16000, 'available', 2, true, true)
  ON CONFLICT DO NOTHING;

  -- PG 6: Mumbai - Blossom Womens PG (Powai)
  v_pg_id := 'b1111111-1111-4111-a111-111111111106';
  INSERT INTO pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_2, 'Blossom Womens Residency', 'Safe & peaceful PG for women near Hiranandani Gardens Powai and IIT Bombay. Beautiful lake view, study desks, and organic meals.', 'Central Avenue, Hiranandani Gardens, Powai', 'Mumbai', 'Powai', 19.1176, 72.9060, 'girls', 'approved', 9, 6, 14000, 26000, 25000, true, true, true, true, true, true, 'Visitor timing strictly 10 AM - 7 PM.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';

  INSERT INTO pg_photos (pg_id, url, caption, is_primary, type) VALUES
    (v_pg_id, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1200&auto=format&fit=crop', 'Spacious Well lit Room', true, 'room')
  ON CONFLICT DO NOTHING;

  INSERT INTO sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES
    (v_pg_id, 1, 26000, 3, 1),
    (v_pg_id, 2, 18000, 3, 1),
    (v_pg_id, 3, 14000, 3, 1)
  ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;

  INSERT INTO beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES
    (v_pg_id, '101', 'Bed A', 'single', 26000, 'available', 1, true, true),
    (v_pg_id, '102', 'Bed A', 'double', 18000, 'available', 1, true, true)
  ON CONFLICT DO NOTHING;

  -- =========================================================================
  -- 5. PUNE PGs (3 listings)
  -- =========================================================================

  -- PG 7: Pune - Cybercity Coliving (Hinjewadi)
  v_pg_id := 'b1111111-1111-4111-a111-111111111107';
  INSERT INTO pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_3, 'Cybercity Coliving Hub', 'Direct access to Hinjewadi IT Park Phase 1. Shuttle service to major tech parks, gym access, gaming room, and high-speed fiber WiFi.', 'Phase 1, Near Rajiv Gandhi IT Park, Hinjewadi', 'Pune', 'Hinjewadi', 18.5912, 73.7389, 'co-ed', 'approved', 15, 12, 7000, 14000, 10000, true, true, true, true, true, true, 'Zero disturbance policy. Gaming room open till midnight.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';

  INSERT INTO pg_photos (pg_id, url, caption, is_primary, type) VALUES
    (v_pg_id, 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1200&auto=format&fit=crop', 'Modern PG Building', true, 'exterior')
  ON CONFLICT DO NOTHING;

  INSERT INTO sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES
    (v_pg_id, 1, 14000, 3, 1),
    (v_pg_id, 2, 9500, 6, 1),
    (v_pg_id, 3, 7000, 6, 1)
  ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;

  INSERT INTO beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES
    (v_pg_id, '101', 'Bed A', 'single', 14000, 'available', 1, true, true),
    (v_pg_id, '102', 'Bed A', 'double', 9500, 'available', 1, true, true)
  ON CONFLICT DO NOTHING;

  -- PG 8: Pune - Viman Nagar Executive PG (Viman Nagar)
  v_pg_id := 'b1111111-1111-4111-a111-111111111108';
  INSERT INTO pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_3, 'Viman Nagar Executive PG', 'Located near Symbiosis International University and Phoenix Marketcity. Best suited for students and young working professionals.', 'Behind Phoenix Marketcity, Viman Nagar', 'Pune', 'Viman Nagar', 18.5679, 73.9143, 'co-ed', 'approved', 12, 9, 8000, 16000, 12000, true, true, true, true, true, true, 'Self cooking facility also available.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';

  INSERT INTO pg_photos (pg_id, url, caption, is_primary, type) VALUES
    (v_pg_id, 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?q=80&w=1200&auto=format&fit=crop', 'Clean Bed Room', true, 'room')
  ON CONFLICT DO NOTHING;

  INSERT INTO sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES
    (v_pg_id, 1, 16000, 4, 1),
    (v_pg_id, 2, 11000, 4, 1),
    (v_pg_id, 3, 8000, 4, 1)
  ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;

  INSERT INTO beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES
    (v_pg_id, '201', 'Bed A', 'single', 16000, 'available', 2, true, true),
    (v_pg_id, '202', 'Bed A', 'double', 11000, 'available', 2, true, true)
  ON CONFLICT DO NOTHING;

  -- PG 9: Pune - Baner Comfort Stays (Baner)
  v_pg_id := 'b1111111-1111-4111-a111-111111111109';
  INSERT INTO pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_3, 'Baner Comfort Stays', 'Modern PG building on Baner Road. Close to cafes, restaurants, and IT offices along Mumbai-Pune highway.', 'Baner High Street, Baner', 'Pune', 'Baner', 18.5590, 73.7868, 'boys', 'approved', 10, 8, 8500, 17000, 15000, true, true, true, true, true, true, 'Regular pest control and deep cleaning included.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';

  INSERT INTO pg_photos (pg_id, url, caption, is_primary, type) VALUES
    (v_pg_id, 'https://images.unsplash.com/photo-1540518614846-7eded433c457?q=80&w=1200&auto=format&fit=crop', 'Master Bedroom', true, 'room')
  ON CONFLICT DO NOTHING;

  INSERT INTO sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES
    (v_pg_id, 1, 17000, 2, 0),
    (v_pg_id, 2, 11500, 4, 1),
    (v_pg_id, 3, 8500, 4, 1)
  ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;

  INSERT INTO beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES
    (v_pg_id, '101', 'Bed A', 'single', 17000, 'available', 1, true, true)
  ON CONFLICT DO NOTHING;

  -- =========================================================================
  -- 6. DELHI PGs (3 listings)
  -- =========================================================================

  -- PG 10: Delhi - North Campus Student Residency (DU North Campus)
  v_pg_id := 'b1111111-1111-4111-a111-111111111110';
  INSERT INTO pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_4, 'North Campus Student Residency', 'Top student PG near Hansraj, SRCC, and Kirori Mal College. Includes study lamps, high-speed WiFi, hot home-style meals, and library area.', 'Kamla Nagar, Near DU North Campus', 'Delhi', 'Kamla Nagar', 28.6800, 77.2050, 'co-ed', 'approved', 16, 12, 9000, 18000, 12000, true, true, true, false, true, true, 'Quiet study atmosphere maintained in evenings.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';

  INSERT INTO pg_photos (pg_id, url, caption, is_primary, type) VALUES
    (v_pg_id, 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1200&auto=format&fit=crop', 'Student Study Room', true, 'room')
  ON CONFLICT DO NOTHING;

  INSERT INTO sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES
    (v_pg_id, 1, 18000, 4, 1),
    (v_pg_id, 2, 12000, 6, 2),
    (v_pg_id, 3, 9000, 6, 1)
  ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;

  INSERT INTO beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES
    (v_pg_id, '101', 'Bed A', 'single', 18000, 'available', 1, true, true)
  ON CONFLICT DO NOTHING;

  -- PG 11: Delhi - South Ex Executive Stay (South Extension)
  v_pg_id := 'b1111111-1111-4111-a111-111111111111';
  INSERT INTO pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_4, 'South Ex Premium Executive PG', 'Luxury stay in South Extension 2 near Metro Station. Air conditioned rooms with attached balcony, power backup, and gourmet food.', 'Part 2, South Extension', 'Delhi', 'South Extension', 28.5684, 77.2217, 'co-ed', 'approved', 10, 7, 13000, 25000, 20000, true, true, true, true, true, true, 'Proper KYC documents required before check-in.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';

  INSERT INTO pg_photos (pg_id, url, caption, is_primary, type) VALUES
    (v_pg_id, 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=1200&auto=format&fit=crop', 'Luxury Balcony Suite', true, 'room')
  ON CONFLICT DO NOTHING;

  INSERT INTO sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES
    (v_pg_id, 1, 25000, 2, 1),
    (v_pg_id, 2, 17000, 4, 1),
    (v_pg_id, 3, 13000, 4, 1)
  ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;

  INSERT INTO beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES
    (v_pg_id, '201', 'Bed A', 'single', 25000, 'available', 2, true, true)
  ON CONFLICT DO NOTHING;

  -- PG 12: Delhi - Saket Metro View Girls PG (Saket)
  v_pg_id := 'b1111111-1111-4111-a111-111111111112';
  INSERT INTO pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_4, 'Saket Metro View Girls PG', '2 minutes walk from Saket Metro station & Select CITYWALK mall. 24x7 guard, CCTV, female warden, biometric access.', 'Block J, Saket', 'Delhi', 'Saket', 28.5246, 77.2066, 'girls', 'approved', 8, 5, 11000, 22000, 18000, true, true, true, true, true, true, 'Warden available round the clock.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';

  INSERT INTO pg_photos (pg_id, url, caption, is_primary, type) VALUES
    (v_pg_id, 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?q=80&w=1200&auto=format&fit=crop', 'Cosy Twin Bedroom', true, 'room')
  ON CONFLICT DO NOTHING;

  INSERT INTO sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES
    (v_pg_id, 1, 22000, 2, 1),
    (v_pg_id, 2, 15000, 4, 1),
    (v_pg_id, 3, 11000, 2, 1)
  ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;

  INSERT INTO beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES
    (v_pg_id, '301', 'Bed A', 'single', 22000, 'available', 3, true, true)
  ON CONFLICT DO NOTHING;

  -- =========================================================================
  -- 7. HYDERABAD PGs (3 listings)
  -- =========================================================================

  -- PG 13: Hyderabad - Hitec City Coliving (Hitec City)
  v_pg_id := 'b1111111-1111-4111-a111-111111111113';
  INSERT INTO pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_5, 'Hitec City Luxury Coliving', 'Situated right in Madhapur/Hitec City near Cyber Towers. Authentic Hyderabadi & South Indian food, high-speed WiFi, and gym access.', 'Near Cyber Towers, Madhapur, Hitec City', 'Hyderabad', 'Hitec City', 17.4504, 78.3808, 'co-ed', 'approved', 14, 11, 8500, 17000, 12000, true, true, true, true, true, true, 'Clean environment with daily room cleaning.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';

  INSERT INTO pg_photos (pg_id, url, caption, is_primary, type) VALUES
    (v_pg_id, 'https://images.unsplash.com/photo-1567496898669-ee935f5f647a?q=80&w=1200&auto=format&fit=crop', 'Modern Interior', true, 'room')
  ON CONFLICT DO NOTHING;

  INSERT INTO sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES
    (v_pg_id, 1, 17000, 4, 1),
    (v_pg_id, 2, 11500, 6, 1),
    (v_pg_id, 3, 8500, 4, 1)
  ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;

  INSERT INTO beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES
    (v_pg_id, '101', 'Bed A', 'single', 17000, 'available', 1, true, true)
  ON CONFLICT DO NOTHING;

  -- PG 14: Hyderabad - Gachibowli Executive Stay (Gachibowli)
  v_pg_id := 'b1111111-1111-4111-a111-111111111114';
  INSERT INTO pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_5, 'Gachibowli Executive Stay', 'Walking distance to Financial District, Microsoft, Wipro, and Amazon offices. Spacious AC rooms with work desks.', 'Near DLF Cyber City, Gachibowli', 'Hyderabad', 'Gachibowli', 17.4401, 78.3489, 'boys', 'approved', 12, 9, 8000, 16000, 10000, true, true, true, true, true, true, 'Quiet environment suitable for working professionals.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';

  INSERT INTO pg_photos (pg_id, url, caption, is_primary, type) VALUES
    (v_pg_id, 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?q=80&w=1200&auto=format&fit=crop', 'Executive Room', true, 'room')
  ON CONFLICT DO NOTHING;

  INSERT INTO sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES
    (v_pg_id, 1, 16000, 3, 1),
    (v_pg_id, 2, 11000, 5, 1),
    (v_pg_id, 3, 8000, 4, 1)
  ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;

  INSERT INTO beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES
    (v_pg_id, '201', 'Bed A', 'single', 16000, 'available', 2, true, true)
  ON CONFLICT DO NOTHING;

  -- PG 15: Hyderabad - Jubilee Hills Womens PG (Jubilee Hills)
  v_pg_id := 'b1111111-1111-4111-a111-111111111115';
  INSERT INTO pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_5, 'Jubilee Hills Womens Residency', 'Upscale womens PG in posh Jubilee Hills neighborhood. High security, organic meals, spacious garden lounge.', 'Road No. 36, Jubilee Hills', 'Hyderabad', 'Jubilee Hills', 17.4319, 78.4072, 'girls', 'approved', 8, 6, 10000, 20000, 18000, true, true, true, true, true, true, 'Safety and security prioritized.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';

  INSERT INTO pg_photos (pg_id, url, caption, is_primary, type) VALUES
    (v_pg_id, 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?q=80&w=1200&auto=format&fit=crop', 'Deluxe Room View', true, 'room')
  ON CONFLICT DO NOTHING;

  INSERT INTO sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES
    (v_pg_id, 1, 20000, 2, 0),
    (v_pg_id, 2, 14000, 4, 1),
    (v_pg_id, 3, 10000, 2, 1)
  ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;

  INSERT INTO beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES
    (v_pg_id, '101', 'Bed A', 'single', 20000, 'available', 1, true, true)
  ON CONFLICT DO NOTHING;

  -- =========================================================================
  -- 8. CHENNAI PGs (3 listings)
  -- =========================================================================

  -- PG 16: Chennai - OMR IT Corridor Coliving (OMR - Thoraipakkam)
  v_pg_id := 'b1111111-1111-4111-a111-111111111116';
  INSERT INTO pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_6, 'OMR IT Corridor Coliving', 'Located on Old Mahabalipuram Road (OMR) near RMZ Millenia and TIDEL Park. Authentic South Indian vegetarian & non-vegetarian food.', 'Thoraipakkam, OMR', 'Chennai', 'OMR', 12.9416, 80.2362, 'co-ed', 'approved', 12, 10, 7500, 15000, 10000, true, true, true, true, true, true, 'Power backup available 24x7.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';

  INSERT INTO pg_photos (pg_id, url, caption, is_primary, type) VALUES
    (v_pg_id, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1200&auto=format&fit=crop', 'Comfort Room', true, 'room')
  ON CONFLICT DO NOTHING;

  INSERT INTO sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES
    (v_pg_id, 1, 15000, 3, 0),
    (v_pg_id, 2, 10000, 5, 1),
    (v_pg_id, 3, 7500, 4, 1)
  ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;

  INSERT INTO beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES
    (v_pg_id, '101', 'Bed A', 'single', 15000, 'available', 1, true, true)
  ON CONFLICT DO NOTHING;

  -- PG 17: Chennai - Velachery Executive PG (Velachery)
  v_pg_id := 'b1111111-1111-4111-a111-111111111117';
  INSERT INTO pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_6, 'Velachery Executive PG', '5 mins from Phoenix Marketcity Chennai and Velachery Railway Station. Ideal for professionals working in Guindy and OMR.', '100 Feet Bypass Road, Velachery', 'Chennai', 'Velachery', 12.9754, 80.2207, 'boys', 'approved', 10, 8, 8000, 16000, 12000, true, true, true, true, true, true, 'RO drinking water on every floor.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';

  INSERT INTO pg_photos (pg_id, url, caption, is_primary, type) VALUES
    (v_pg_id, 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=1200&auto=format&fit=crop', 'Twin Room', true, 'room')
  ON CONFLICT DO NOTHING;

  INSERT INTO sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES
    (v_pg_id, 1, 16000, 2, 0),
    (v_pg_id, 2, 11000, 4, 1),
    (v_pg_id, 3, 8000, 4, 1)
  ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;

  INSERT INTO beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES
    (v_pg_id, '201', 'Bed A', 'single', 16000, 'available', 2, true, true)
  ON CONFLICT DO NOTHING;

  -- PG 18: Chennai - T Nagar Ladies Stay (T Nagar)
  v_pg_id := 'b1111111-1111-4111-a111-111111111118';
  INSERT INTO pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_6, 'T Nagar Ladies Stay', 'Safe womens stay near Pondy Bazaar shopping hub & Usman Road. High security with female staff and biometric gate.', 'Burkit Road, T Nagar', 'Chennai', 'T Nagar', 13.0418, 80.2341, 'girls', 'approved', 8, 6, 9000, 18000, 15000, true, true, true, true, true, true, 'Safety first policy.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';

  INSERT INTO pg_photos (pg_id, url, caption, is_primary, type) VALUES
    (v_pg_id, 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=1200&auto=format&fit=crop', 'Room View', true, 'room')
  ON CONFLICT DO NOTHING;

  INSERT INTO sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES
    (v_pg_id, 1, 18000, 2, 0),
    (v_pg_id, 2, 13000, 4, 1),
    (v_pg_id, 3, 9000, 2, 1)
  ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;

  INSERT INTO beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES
    (v_pg_id, '101', 'Bed A', 'single', 18000, 'available', 1, true, true)
  ON CONFLICT DO NOTHING;

  -- =========================================================================
  -- 9. NOIDA PGs (3 listings)
  -- =========================================================================

  -- PG 19: Noida - Sector 62 IT Hub Coliving (Sector 62)
  v_pg_id := 'b1111111-1111-4111-a111-111111111119';
  INSERT INTO pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_7, 'Sector 62 IT Hub Coliving', 'Walking distance to Stellar IT Park, Logix Cyber Park, and Sector 62 Metro. 1GBps internet, gaming zone, and meal plans.', 'Block B, Sector 62', 'Noida', 'Sector 62', 28.6275, 77.3670, 'co-ed', 'approved', 14, 11, 7500, 15000, 10000, true, true, true, true, true, true, 'Clean and peaceful working atmosphere.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';

  INSERT INTO pg_photos (pg_id, url, caption, is_primary, type) VALUES
    (v_pg_id, 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?q=80&w=1200&auto=format&fit=crop', 'Comfort AC Room', true, 'room')
  ON CONFLICT DO NOTHING;

  INSERT INTO sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES
    (v_pg_id, 1, 15000, 4, 1),
    (v_pg_id, 2, 10000, 6, 1),
    (v_pg_id, 3, 7500, 4, 1)
  ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;

  INSERT INTO beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES
    (v_pg_id, '101', 'Bed A', 'single', 15000, 'available', 1, true, true)
  ON CONFLICT DO NOTHING;

  -- PG 20: Noida - Sector 18 Wave Mall Stay (Sector 18)
  v_pg_id := 'b1111111-1111-4111-a111-111111111120';
  INSERT INTO pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_7, 'Sector 18 Wave Mall Stay', 'Right next to Sector 18 Metro & Mall of India. Excellent connectivity to Delhi and Greater Noida Expressway.', 'Sector 18, Near Wave Mall', 'Noida', 'Sector 18', 28.5708, 77.3261, 'boys', 'approved', 10, 8, 8500, 17000, 12000, true, true, true, true, true, true, 'Close to metro station.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';

  INSERT INTO pg_photos (pg_id, url, caption, is_primary, type) VALUES
    (v_pg_id, 'https://images.unsplash.com/photo-1540518614846-7eded433c457?q=80&w=1200&auto=format&fit=crop', 'Master Bedroom', true, 'room')
  ON CONFLICT DO NOTHING;

  INSERT INTO sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES
    (v_pg_id, 1, 17000, 2, 0),
    (v_pg_id, 2, 11500, 4, 1),
    (v_pg_id, 3, 8500, 4, 1)
  ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;

  INSERT INTO beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES
    (v_pg_id, '201', 'Bed A', 'single', 17000, 'available', 2, true, true)
  ON CONFLICT DO NOTHING;

  -- PG 21: Noida - Knowledge Park Student PG (Greater Noida Expressway)
  v_pg_id := 'b1111111-1111-4111-a111-111111111121';
  INSERT INTO pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_7, 'Knowledge Park Student PG', 'Ideal stay for college students near Amity University and Jaypee Institute. Shuttle facility to university gates.', 'Sector 125, Near Amity University', 'Noida', 'Sector 125', 28.5445, 77.3330, 'co-ed', 'approved', 16, 13, 7000, 14000, 10000, true, true, true, true, true, true, 'Student study desks and power backup.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';

  INSERT INTO pg_photos (pg_id, url, caption, is_primary, type) VALUES
    (v_pg_id, 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1200&auto=format&fit=crop', 'Study Desks Room', true, 'room')
  ON CONFLICT DO NOTHING;

  INSERT INTO sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES
    (v_pg_id, 1, 14000, 4, 1),
    (v_pg_id, 2, 9500, 6, 1),
    (v_pg_id, 3, 7000, 6, 1)
  ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;

  INSERT INTO beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES
    (v_pg_id, '101', 'Bed A', 'single', 14000, 'available', 1, true, true)
  ON CONFLICT DO NOTHING;

  -- =========================================================================
  -- 10. GURGAON PGs (3 listings)
  -- =========================================================================

  -- PG 22: Gurgaon - Cyber City Premium Coliving (Cyber City / DLF Phase 2)
  v_pg_id := 'b1111111-1111-4111-a111-111111111122';
  INSERT INTO pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_8, 'Cyber City Premium Coliving', '5 mins from DLF Cyber Hub & Rapid Metro. Luxury living spaces with 500Mbps WiFi, buffet meals, gym, and rooftop lounge.', 'DLF Phase 2, Near Cyber Hub', 'Gurgaon', 'DLF Phase 2', 28.4907, 77.0898, 'co-ed', 'approved', 14, 11, 11000, 24000, 20000, true, true, true, true, true, true, 'Top tier amenities for tech professionals.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';

  INSERT INTO pg_photos (pg_id, url, caption, is_primary, type) VALUES
    (v_pg_id, 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=1200&auto=format&fit=crop', 'Cyber Hub Luxury Room', true, 'room')
  ON CONFLICT DO NOTHING;

  INSERT INTO sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES
    (v_pg_id, 1, 24000, 4, 1),
    (v_pg_id, 2, 16000, 6, 1),
    (v_pg_id, 3, 11000, 4, 1)
  ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;

  INSERT INTO beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES
    (v_pg_id, '101', 'Bed A', 'single', 24000, 'available', 1, true, true)
  ON CONFLICT DO NOTHING;

  -- PG 23: Gurgaon - Golf Course Road Executive PG (Golf Course Road / Sector 43)
  v_pg_id := 'b1111111-1111-4111-a111-111111111123';
  INSERT INTO pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_8, 'Golf Course Road Executive PG', 'Premium stay on Golf Course Road. Close to One Horizon Center, Sector 42-43 Rapid Metro, and major corporate towers.', 'Sector 43, Golf Course Road', 'Gurgaon', 'Golf Course Road', 28.4485, 77.0945, 'boys', 'approved', 10, 8, 12000, 26000, 25000, true, true, true, true, true, true, 'Spacious rooms with attached balconies.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';

  INSERT INTO pg_photos (pg_id, url, caption, is_primary, type) VALUES
    (v_pg_id, 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=1200&auto=format&fit=crop', 'Executive Balcony Room', true, 'room')
  ON CONFLICT DO NOTHING;

  INSERT INTO sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES
    (v_pg_id, 1, 26000, 2, 0),
    (v_pg_id, 2, 17000, 4, 1),
    (v_pg_id, 3, 12000, 4, 1)
  ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;

  INSERT INTO beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES
    (v_pg_id, '201', 'Bed A', 'single', 26000, 'available', 2, true, true)
  ON CONFLICT DO NOTHING;

  -- PG 24: Gurgaon - Sohna Road Co-Living Stay (Sohna Road / Sector 48)
  v_pg_id := 'b1111111-1111-4111-a111-111111111124';
  INSERT INTO pg_listings (id, owner_id, name, description, address, city, locality, latitude, longitude, pg_type, status, total_beds, available_beds, monthly_rent_min, monthly_rent_max, deposit_amount, food_included, wifi_included, ac_rooms, parking, laundry, security_24x7, rules) VALUES
    (v_pg_id, v_owner_8, 'Sohna Road Co-Living Stay', 'Located near Subhash Chowk & Spaze iTech Park. Gated society security, swimming pool access, and daily fresh meals.', 'Sector 48, Sohna Road', 'Gurgaon', 'Sohna Road', 28.4190, 77.0385, 'co-ed', 'approved', 12, 10, 9000, 18000, 15000, true, true, true, true, true, true, 'Quiet and green surroundings.')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'approved';

  INSERT INTO pg_photos (pg_id, url, caption, is_primary, type) VALUES
    (v_pg_id, 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?q=80&w=1200&auto=format&fit=crop', 'Spacious Co-living Room', true, 'room')
  ON CONFLICT DO NOTHING;

  INSERT INTO sharing_types (pg_id, type, price_monthly, total_beds, occupied_beds) VALUES
    (v_pg_id, 1, 18000, 4, 1),
    (v_pg_id, 2, 12500, 4, 1),
    (v_pg_id, 3, 9000, 4, 0)
  ON CONFLICT (pg_id, type) DO UPDATE SET price_monthly = EXCLUDED.price_monthly;

  INSERT INTO beds (pg_id, room_number, bed_label, sharing_type, monthly_rent, status, floor_number, has_ac, has_attached_bath) VALUES
    (v_pg_id, '101', 'Bed A', 'single', 18000, 'available', 1, true, true)
  ON CONFLICT DO NOTHING;

  -- 11. INSERT INITIAL REVIEWS FOR SEEDED PGs
  INSERT INTO reviews (user_id, pg_id, rating, comment)
  SELECT 
    v_owner_1,
    id,
    4 + (random() * 1)::integer,
    'Great property! Very clean, excellent food quality and supportive staff.'
  FROM pg_listings
  ON CONFLICT (user_id, pg_id) DO NOTHING;

END $$;
