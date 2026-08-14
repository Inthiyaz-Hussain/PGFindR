import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const regions = [
  'aws-0-ap-south-1.pooler.supabase.com',       // Mumbai
  'aws-0-ap-southeast-1.pooler.supabase.com',  // Singapore
  'aws-0-ap-southeast-2.pooler.supabase.com',  // Sydney
  'aws-0-ap-northeast-1.pooler.supabase.com',  // Tokyo
  'aws-0-ap-northeast-2.pooler.supabase.com',  // Seoul
  'aws-0-us-east-1.pooler.supabase.com',       // N. Virginia
  'aws-0-us-east-2.pooler.supabase.com',       // Ohio
  'aws-0-us-west-1.pooler.supabase.com',       // N. California
  'aws-0-us-west-2.pooler.supabase.com',       // Oregon
  'aws-0-eu-west-1.pooler.supabase.com',       // Ireland
  'aws-0-eu-west-2.pooler.supabase.com',       // London
  'aws-0-eu-central-1.pooler.supabase.com',      // Frankfurt
  'aws-0-ca-central-1.pooler.supabase.com',      // Canada
  'aws-0-sa-east-1.pooler.supabase.com'         // Brazil
];

async function run() {
  const sqlPath = path.join(__dirname, '../supabase/migrations/20260814120000_add_email_to_profiles.sql');
  console.log('Reading migration file:', sqlPath);
  const sql = fs.readFileSync(sqlPath, 'utf8');

  let success = false;
  // Try port 6543 (transaction) and port 5432 (session)
  const ports = [6543, 5432];

  for (const host of regions) {
    for (const port of ports) {
      const connectionString = `postgresql://postgres.eqoipazlemmsleqnkzfg:Inthiyaz%407148@${host}:${port}/postgres`;
      console.log(`Trying connection to ${host}:${port}...`);
      const client = new pg.Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
      });

      try {
        await client.connect();
        console.log(`Connected successfully to ${host}:${port}!`);
        
        console.log('Executing custom migration SQL...');
        await client.query(sql);
        console.log('Migration executed successfully!');
        
        await client.end();
        success = true;
        break;
      } catch (err) {
        console.log(`Failed for ${host}:${port}: ${err.message || err}`);
        try {
          await client.end();
        } catch (e) {}
      }
    }
    if (success) break;
  }

  if (!success) {
    console.error('Could not connect to any of the pooler regions.');
    process.exit(1);
  }
}

run();
