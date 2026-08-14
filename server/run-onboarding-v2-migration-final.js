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

    // 1. Run add_email_to_profiles.sql
    const emailSqlPath = path.join(__dirname, '../supabase/migrations/20260814120000_add_email_to_profiles.sql');
    if (fs.existsSync(emailSqlPath)) {
      console.log('Reading and running email migration...');
      const emailSql = fs.readFileSync(emailSqlPath, 'utf8');
      try {
        await client.query(emailSql);
        console.log('Email migration executed successfully!');
      } catch (err) {
        console.warn('Email migration warning (might already exist):', err.message || err);
      }
    }

    // 2. Run owner_onboarding_v2.sql
    const onboardingSqlPath = path.join(__dirname, '../supabase/migrations/20260814140000_owner_onboarding_v2.sql');
    console.log('Reading and running onboarding v2 migration...');
    const onboardingSql = fs.readFileSync(onboardingSqlPath, 'utf8');
    await client.query(onboardingSql);
    console.log('Onboarding v2 migration executed successfully!');

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
