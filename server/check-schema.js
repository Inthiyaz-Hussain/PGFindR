import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data } = await supabase.from('inquiries').select('*').limit(1);
  console.log('inquiries schema:', Object.keys(data[0] || {}));
  
  const { data: r } = await supabase.from('rooms').select('*').limit(1);
  console.log('rooms schema:', Object.keys(r[0] || {}));
  
  const { data: b } = await supabase.from('beds').select('*').limit(1);
  console.log('beds schema:', Object.keys(b[0] || {}));
}
test();
