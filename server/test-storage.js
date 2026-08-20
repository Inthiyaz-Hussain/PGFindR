import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Checking buckets...");
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error("Error listing buckets:", error.message);
    return;
  }
  
  console.log("Buckets:", buckets.map(b => b.name));
  
  if (!buckets.find(b => b.name === 'pg-images')) {
    console.log("Creating pg-images bucket...");
    const { error: createError } = await supabase.storage.createBucket('pg-images', { public: true });
    if (createError) console.error("Failed to create bucket:", createError.message);
    else console.log("Bucket created!");
  } else {
    console.log("Bucket 'pg-images' exists.");
  }
}
run();
