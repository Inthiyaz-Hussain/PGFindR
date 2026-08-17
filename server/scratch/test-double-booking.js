import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDoubleBooking() {
  console.log('--- STARTING DOUBLE BOOKING CONCURRENCY TEST ---')

  // 1. Fetch any available bed
  let { data: beds, error: fetchErr } = await supabase
    .from('beds')
    .select('id, pg_id, status')
    .eq('status', 'available')
    .limit(1)

  if (fetchErr || !beds || beds.length === 0) {
    console.log('No available beds found to perform the test. Resetting status on one bed first...')
    const { data: allBeds } = await supabase.from('beds').select('id, pg_id').limit(1)
    if (!allBeds || allBeds.length === 0) {
      console.error('No beds at all in the database. Please seed the database first.')
      process.exit(1)
    }
    await supabase.from('beds').update({ status: 'available' }).eq('id', allBeds[0].id)
    beds = [{ id: allBeds[0].id, pg_id: allBeds[0].pg_id }]
  }

  const bedId = beds[0].id
  const pgId = beds[0].pg_id
  console.log(`Using Bed ID: ${bedId} (PG ID: ${pgId})`)

  // Ensure status is available before test starts
  await supabase
    .from('beds')
    .update({ status: 'available' })
    .eq('id', bedId)

  console.log('Sending two concurrent reservation requests at the exact same millisecond...')

  // 2. Fire concurrent RPC calls
  const [res1, res2] = await Promise.all([
    supabase.rpc('reserve_bed_safely', { p_bed_id: bedId, p_pg_id: pgId, p_num_beds: 1 }),
    supabase.rpc('reserve_bed_safely', { p_bed_id: bedId, p_pg_id: pgId, p_num_beds: 1 })
  ])

  console.log('\n--- RESULTS ---')
  console.log(`Request 1 Success: ${res1.data} (Error: ${res1.error?.message || 'None'})`)
  console.log(`Request 2 Success: ${res2.data} (Error: ${res2.error?.message || 'None'})`)

  // 3. Verification Assertion
  const successCount = (res1.data ? 1 : 0) + (res2.data ? 1 : 0)
  if (successCount === 1) {
    console.log('\n✅ SUCCESS: Only exactly one concurrent request succeeded. Double-booking prevented!')
  } else {
    console.error(`\n❌ FAILURE: Expected exactly 1 success, but got ${successCount}.`)
    process.exit(1)
  }

  // Clean up: reset bed back to available
  await supabase
    .from('beds')
    .update({ status: 'available' })
    .eq('id', bedId)

  console.log('--- CONCURRENCY TEST FINISHED ---')
}

testDoubleBooking().catch(console.error)
