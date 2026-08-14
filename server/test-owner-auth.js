import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers()

  if (error) {
    console.error('Error listing users:', error)
    return
  }

  const aloha = users.find(u => u.id === 'cb3dacbe-afee-4db8-a36b-35af29ce0027')
  console.log('Aloha user auth details:', aloha)
}

test()
