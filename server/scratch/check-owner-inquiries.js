import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config()
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') })

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is missing!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkInquiries() {
  const { data: inquiries, error } = await supabase
    .from('owner_inquiries')
    .select('id, full_name, email, pg_name, status, reset_token, reset_token_expires_at, reset_token_used, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching owner inquiries:', error)
    return
  }

  console.log('\n--- Owner Inquiries List ---')
  if (inquiries.length === 0) {
    console.log('No inquiries found.')
  } else {
    for (const inq of inquiries) {
      console.log(`\nID: ${inq.id}`)
      console.log(`Name: ${inq.full_name}`)
      console.log(`Email: ${inq.email}`)
      console.log(`PG: ${inq.pg_name}`)
      console.log(`Status: ${inq.status}`)
      console.log(`Token: ${inq.reset_token ? inq.reset_token.slice(0, 10) + '...' : 'None'}`)
      console.log(`Expires: ${inq.reset_token_expires_at}`)
      console.log(`Used: ${inq.reset_token_used}`)
      console.log(`Created At: ${inq.created_at}`)
    }
  }
  console.log('\n----------------------------')
}

checkInquiries()
