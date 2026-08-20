import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const username = 'postgres.eqoipazlemmsleqnkzfg';
  const password = 'Inthiyaz@7148';
  const host = 'aws-1-ap-northeast-1.pooler.supabase.com';
  const port = 5432;

  const connectionString = `postgresql://${username}:${encodeURIComponent(password)}@${host}:${port}/postgres`;
  console.log(`Connecting to database pooler at ${host}:${port}...`);
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected successfully!');

    const sqlPath = path.join(__dirname, '../supabase/migrations/20260819120000_cloudflare_r2_integration.sql');
    console.log('Reading and running Cloudflare R2 integration migration...');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await client.query(sql);
    console.log('Migration executed successfully!');

    await client.end();
    console.log('All migrations completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    try {
      await client.end();
    } catch (e) {}
    process.exit(1);
  }
}

run();
