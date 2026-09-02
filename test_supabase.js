const { createClient } = require('@supabase/supabase-js');
const url = 'https://eqoipazlemmsleqnkzfg.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxb2lwYXpsZW1tc2xlcW5remZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTc4NDIyNCwiZXhwIjoyMDk3MzYwMjI0fQ.0xh_FWpZhnTH01ZNxNA_EaCMVH5qE7vICqMUulHwlsU';
const supabase = createClient(url, key);

async function test() {
  console.log('Testing connection to Supabase...');
  const { data, error } = await supabase.from('custom_nearby_places').select('*').limit(1);
  if (error) {
    console.error('Error fetching custom_nearby_places:', error);
  } else {
    console.log('Success! Table exists. Data:', data);
  }
}
test();
