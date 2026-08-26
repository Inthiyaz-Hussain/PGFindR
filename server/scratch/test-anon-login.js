import { createClient } from '@supabase/supabase-js';

const url = 'https://eqoipazlemmsleqnkzfg.supabase.co';

const key1 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxb2lwYXpsZW1tc2xlcW5remZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3ODQyMjQsImV4cCI6Mjk5NzY5NzU5MX0.J8N54JnBBPLf9wPK4fb_5TPJF_qyD06o73NQ4FtC0mQ'; // from .env
const key2 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxb2lwYXpsZW1tc2xlcW5remZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3ODQyMjQsImV4cCI6MjA5NzM2MDIyNH0.J8N54JnBBPLf9wPK4fb_5TPJF_qyD06o73NQ4FtC0mQ'; // from client supabase.ts

async function test(key, label) {
  const client = createClient(url, key);
  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: 'test_owner_flow@findpgroom.in',
      password: 'SecurePassword123!'
    });
    if (error) {
      console.log(`${label} failed: ${error.message} (Status: ${error.status})`);
    } else {
      console.log(`${label} SUCCEEDED! User:`, data.user.email);
    }
  } catch (e) {
    console.log(`${label} error:`, e.message);
  }
}

async function run() {
  await test(key1, 'Key 1 (.env key)');
  await test(key2, 'Key 2 (client fallback key)');
}

run();
