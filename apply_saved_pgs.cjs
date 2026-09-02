const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const url = 'https://eqoipazlemmsleqnkzfg.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxb2lwYXpsZW1tc2xlcW5remZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTc4NDIyNCwiZXhwIjoyMDk3MzYwMjI0fQ.0xh_FWpZhnTH01ZNxNA_EaCMVH5qE7vICqMUulHwlsU';
const supabase = createClient(url, key);

async function applyMigration() {
  const sql = fs.readFileSync('c:\\Internship\\new\\project\\supabase\\migrations\\20260902144428_create_saved_pgs.sql', 'utf8');
  
  // Since we can't execute arbitrary SQL via JS easily without an RPC, let's create a quick function
  // Actually, wait, Supabase REST API does not allow running arbitrary SQL.
  console.log("Please run this SQL directly in your Supabase SQL Editor:");
  console.log(sql);
}

applyMigration();
