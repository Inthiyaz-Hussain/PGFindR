const { createClient } = require('@supabase/supabase-js');
const url = 'https://eqoipazlemmsleqnkzfg.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxb2lwYXpsZW1tc2xlcW5remZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3ODQyMjQsImV4cCI6MjA5NzM2MDIyNH0.J8N54JnBBPLf9wPK4fb_5TPJF_qyD06o73NQ4FtC0mQ';
const supabase = createClient(url, key);

async function test() {
  console.log('Testing connection to Supabase with ANON key...');
  const { data, error } = await supabase.from('custom_nearby_places').select('*').eq('pg_id', '69f5035e-3e8f-426c-8fb1-2902979b739b');
  if (error) {
    console.error('Error fetching custom_nearby_places:', error);
  } else {
    console.log('Anon fetch data length:', data.length);
    console.log('Anon fetch data:', data);
  }
}
test();
