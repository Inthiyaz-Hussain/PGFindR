import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DB URL from env or fallback to env.example value for this project
const connectionString = process.env.SUPABASE_DB_URL || 'postgresql://postgres:Inthiyaz%407148@[2406:da14:1772:ea00:1879:dcf2:86d2:809a]:5432/postgres';

console.log('Connecting to PostgreSQL database...');
const client = new pg.Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  try {
    await client.connect();
    console.log('Connected successfully!');

    const sqlPath = path.join(__dirname, '../supabase/migrations/20260809200000_owner_features_v1_1.sql');
    console.log('Reading migration file:', sqlPath);
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing migration SQL...');
    await client.query(sql);
    console.log('Migration executed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

run();
