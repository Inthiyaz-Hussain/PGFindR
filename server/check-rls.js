import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  // Login as admin
  const { data: { session }, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'inthiyazhussain69@gmail.com', // wait, is this owner or admin? user told me "Inthiyaz%123 this is password"
    password: 'Inthiyaz%123'
  });
  if (authErr) {
    console.error('Auth error:', authErr);
    return;
  }
  console.log('Logged in as:', session?.user.id);
  
  const { data: b, error: e1 } = await supabase.from('bookings').select('*');
  console.log('Bookings as user:', b?.length, e1);
  
  const { data: p, error: e2 } = await supabase.from('payments').select('*');
  console.log('Payments as user:', p?.length, e2);
}
test();
