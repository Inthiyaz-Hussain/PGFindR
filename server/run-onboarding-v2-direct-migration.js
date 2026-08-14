import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const sqlPath = path.join(__dirname, '../supabase/migrations/20260814140000_owner_onboarding_v2.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const connectionString = 'postgresql://postgres:Inthiyaz%407148@[2406:da14:1772:ea00:1879:dcf2:86d2:809a]:5432/postgres';
  console.log('Connecting directly to Supabase DB via IPv6 address...');
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected successfully to db.eqoipazlemmsleqnkzfg.supabase.co:5432');
    await client.query(sql);
    console.log('Migration executed successfully!');
    await client.end();
  } catch (err) {
    console.error('Failed to run migration:', err);
    try {
      await client.end();
    } catch (e) {}
    process.exit(1);
  }
}

run();
