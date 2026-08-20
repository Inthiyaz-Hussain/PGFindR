import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: { session }, error: authErr } = await supabase.auth.signInWithPassword({ email: 'inthiyazhussain69@gmail.com', password: 'Inthiyaz%123' });
  if (authErr) {
    console.error('Auth error:', authErr);
    return;
  }
  console.log('Logged in user:', session?.user.id);
  
  const { data: pgs } = await supabase.from('pg_listings').select('id').eq('owner_id', session.user.id);
  
  if (pgs && pgs.length > 0) {
    const pgIds = pgs.map(p => p.id);
    const { data: inqs, error: inqErr } = await supabase
        .from('inquiries')
        .select('*, pg:pg_listings(name, city), seeker:profiles!inquiries_seeker_id_fkey(full_name, phone)')
        .in('pg_id', pgIds)
        .order('created_at', { ascending: false });
    console.log('Inquiries fetched with join:', JSON.stringify(inqs, null, 2), inqErr);
  }
}
test();
