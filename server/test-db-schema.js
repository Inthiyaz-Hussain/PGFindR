import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

console.log('URL:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const { data, error } = await supabase
    .from('profiles')
    .select('email')
    .limit(1)

  if (error) {
    console.error('Error fetching profiles columns:', error)
  } else {
    console.log('Successfully fetched columns. Data:', data)
  }
}

test()
