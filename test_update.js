import { supabase } from './server/src/index.js';
import dotenv from 'dotenv';
dotenv.config({path: './server/.env'});

async function run() {
  console.log('Using Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Service Role' : 'Anon');
  
  // get any review
  const { data: review } = await supabase.from('reviews').select('*').limit(1).single();
  if (!review) {
    console.log('No reviews found');
    return;
  }
  
  console.log('Review found:', review.id);
  
  // try to update it
  const { error } = await supabase
    .from('reviews')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', review.id);
    
  console.log('Update error:', error);
}
run();
