import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// 1. Load server .env for service role key
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseUrl = process.env.SUPABASE_URL || 'https://eqoipazlemmsleqnkzfg.supabase.co'

// 2. Load root .env to get the correct anon key
dotenv.config({ path: path.resolve(process.cwd(), '../.env') })
const anonKey = process.env.VITE_SUPABASE_ANON_KEY

console.log('URL:', supabaseUrl)
console.log('Service role key:', serviceRoleKey ? `${serviceRoleKey.slice(0, 15)}...${serviceRoleKey.slice(-15)}` : 'undefined')
console.log('Anon key:', anonKey ? `${anonKey.slice(0, 15)}...${anonKey.slice(-15)}` : 'undefined')

const adminClient = createClient(supabaseUrl, serviceRoleKey)
const client = createClient(supabaseUrl, anonKey)

const ownerId = 'cb3dacbe-afee-4db8-a36b-35af29ce0027'

async function test() {
  const { data: { user }, error: userErr } = await adminClient.auth.admin.getUserById(ownerId)
  if (userErr || !user) {
    console.error('Error fetching owner user:', userErr)
    return
  }

  const email = user.email
  console.log('Owner email:', email)

  const { error: updateErr } = await adminClient.auth.admin.updateUserById(ownerId, {
    password: 'TempOwner@123',
    email_confirm: true
  })

  if (updateErr) {
    console.error('Error updating user password:', updateErr)
    return
  }

  const { data: authData, error: signInErr } = await client.auth.signInWithPassword({
    email,
    password: 'TempOwner@123'
  })

  if (signInErr || !authData.session) {
    console.error('Error signing in as owner:', signInErr)
    return
  }

  console.log('Sign in successful.')

  // Query pg_listings
  const { data: listings, error: pgErr } = await client
    .from('pg_listings')
    .select('id, name, status')

  console.log('Owner listings:', listings, pgErr)

  // Query inquiries
  const { data: inquiries, error: inqErr } = await client
    .from('inquiries')
    .select('id, pg_id, full_name')

  console.log('Owner inquiries:', inquiries, inqErr)

  await client.auth.signOut()
}

test()
