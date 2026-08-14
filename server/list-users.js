import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseUrl = process.env.SUPABASE_URL || 'https://eqoipazlemmsleqnkzfg.supabase.co'

const adminClient = createClient(supabaseUrl, serviceRoleKey)

const id = 'cb3dacbe-afee-4db8-a36b-35af29ce0027' // aloha@gmail.com

async function run() {
  console.log(`Checking user ID: ${id}...`)
  const { data: { user }, error } = await adminClient.auth.admin.getUserById(id)
  if (error) {
    console.error(`Error for ${id}:`, error)
  } else if (user) {
    console.log(`User: ${user.email}`)
    console.log(`Confirmed At: ${user.email_confirmed_at}`)
    console.log(`User Metadata:`, user.user_metadata)
  }
}

run()
