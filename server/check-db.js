import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkInquiries() {
  console.log('Checking recent pg_listings...');
  const { data: pgs, error: pgsErr } = await supabase.from('pg_listings').select('id, owner_id, name').order('created_at', { ascending: false }).limit(5);
  if (pgsErr) console.error(pgsErr);
  else console.log('Recent PGs:', pgs);

  console.log('\nChecking recent inquiries...');
  const { data: inqs, error: inqsErr } = await supabase.from('inquiries').select('id, pg_id, seeker_id, full_name').order('created_at', { ascending: false }).limit(5);
  if (inqsErr) console.error(inqsErr);
  else console.log('Recent Inquiries:', inqs);
}

checkInquiries();
