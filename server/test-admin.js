import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, count, error } = await supabase
    .from('payments')
    .select(`
      id,
      booking_id,
      amount,
      commission_rate,
      commission_amount,
      owner_payout,
      status,
      payment_type,
      created_at,
      cashfree_payment_id,
      platform_fee,
      service_charge,
      booking:bookings!payments_booking_id_fkey(
        pg:pg_listings(name),
        seeker:profiles!bookings_seeker_id_fkey(full_name),
        owner:profiles!bookings_owner_id_fkey(full_name)
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('Admin Payments error:', error);
  console.log('Admin Payments count:', count);
  console.log('Admin Payments data:', JSON.stringify(data, null, 2));
}
test();
