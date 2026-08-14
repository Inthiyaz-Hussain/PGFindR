import fetch from 'node-fetch';

const url = 'https://eqoipazlemmsleqnkzfg.supabase.co/rest/v1/';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxb2lwYXpsZW1tc2xlcW5remZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3ODQyMjQsImV4cCI6MjA5NzM2MDIyNH0.J8N54JnBBPLf9wPK4fb_5TPJF_qyD06o73NQ4FtC0mQ';

async function getSpec() {
  try {
    console.log('Fetching OpenAPI spec from PostgREST...');
    const res = await fetch(url, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    const data = await res.json();
    console.log('OpenAPI Spec fetched successfully!');
    
    // Check paths for any rpc calls
    const paths = Object.keys(data.paths || {});
    const rpcs = paths.filter(p => p.startsWith('/rpc/'));
    console.log('Available RPC paths in database:', rpcs);
  } catch (err) {
    console.error('Error fetching OpenAPI spec:', err);
  }
}

getSpec();
