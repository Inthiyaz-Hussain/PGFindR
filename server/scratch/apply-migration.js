import fs from 'fs'
import path from 'path'
import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const dbUrl = process.env.SUPABASE_DB_URL || `postgresql://postgres.eqoipazlemmsleqnkzfg:${encodeURIComponent('Inthiyaz@7148')}@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres`

async function runMigration() {
  console.log('Connecting to database to apply migration...')
  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false } // Required for Supabase hosted Postgres
  })

  await client.connect()
  try {
    const migrationPath = path.resolve('..', 'supabase', 'migrations', '20260817120000_owner_portal_tenant_features.sql')
    console.log(`Reading migration from: ${migrationPath}`)
    const sql = fs.readFileSync(migrationPath, 'utf8')

    console.log('Executing migration SQL...')
    await client.query(sql)
    console.log('✅ Migration applied successfully!')
  } catch (err) {
    console.error('❌ Migration failed:', err)
  } finally {
    await client.end()
  }
}

runMigration()
