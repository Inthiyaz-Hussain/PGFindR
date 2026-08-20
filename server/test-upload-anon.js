import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Testing upload with ANON key...");
  const dummyFile = new Blob(['hello world'], { type: 'text/plain' });
  const { data, error } = await supabase.storage
    .from('pg-images')
    .upload(`test-upload-${Date.now()}.txt`, dummyFile, { upsert: false });
    
  if (error) {
    console.error("Upload error with anon key:", error.message);
  } else {
    console.log("Upload success:", data);
  }
}
run();
