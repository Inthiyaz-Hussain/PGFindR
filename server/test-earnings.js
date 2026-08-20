import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: { session } } = await supabase.auth.signInWithPassword({
    email: 'inthiyazhussain69@gmail.com',
    password: 'Inthiyaz%123'
  });
  const userId = session?.user.id;

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id')
    .eq('owner_id', userId);
  
  const bookingIds = (bookings || []).map(b => b.id);
  console.log('bookingIds:', bookingIds);

  if (bookingIds.length > 0) {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        id,
        amount,
        commission_rate,
        commission_amount,
        owner_payout,
        status,
        payment_type,
        created_at,
        booking:bookings!payments_booking_id_fkey(
          id,
          monthly_rent,
          move_in_date,
          pg:pg_listings(name, city),
          seeker:profiles(full_name)
        )
      `)
      .in('booking_id', bookingIds)
      .order('created_at', { ascending: false });

    console.log('Payments error:', error);
    console.log('Payments data:', JSON.stringify(data, null, 2));
  }
}
test();
