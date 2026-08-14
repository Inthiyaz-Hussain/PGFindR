import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

console.log('URL:', supabaseUrl)
console.log('Key exists:', !!supabaseKey)

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id')
    .limit(1)

  if (profErr || !profiles || profiles.length === 0) {
    console.error('Error fetching profile:', profErr)
    return
  }

  const ownerId = profiles[0].id
  console.log('Using owner ID:', ownerId)

  // Full form payload mock
  const payload = {
    name: 'Test PG full payload',
    description: '',
    address: 'Test Address 12345',
    city: 'Test City',
    locality: 'Test Locality',
    latitude: null,
    longitude: null,
    pg_type: 'coliving',
    deposit_amount: 0,
    food_included: false,
    wifi_included: false,
    ac_rooms: false,
    parking: false,
    laundry: false,
    security_24x7: false,
    rules: '',
    pincode: '',
    near_malls: '',
    near_parks: '',
    near_pubs: '',
    near_transit: '',
    owner_id: ownerId,
    monthly_rent_min: 0,
    monthly_rent_max: 0,
    total_beds: 0,
    available_beds: 0,
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('pg_listings')
    .insert(payload)
    .select('id')

  if (error) {
    console.error('Error inserting full payload:', error)
  } else {
    console.log('Successfully inserted full payload. Data:', data)
    // Clean up
    await supabase.from('pg_listings').delete().eq('id', data[0].id)
    console.log('Cleaned up temp listing.')
  }
}

test()
