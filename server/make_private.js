import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || 'https://eqoipazlemmsleqnkzfg.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!key) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

async function setBucketPrivate() {
  const { error } = await supabase.storage.updateBucket('owner-documents', {
    public: false,
  });
  if (error) {
    console.error("Failed to make private", error);
  } else {
    console.log("owner-documents is now private");
  }
}

setBucketPrivate();
