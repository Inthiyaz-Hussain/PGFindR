import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: b, error: e1 } = await supabase.from('bookings').select('*');
  console.log('Bookings:', b?.length);
  
  const { data: p, error: e2 } = await supabase.from('payments').select('*');
  console.log('Payments:', p?.length);
}
test();
