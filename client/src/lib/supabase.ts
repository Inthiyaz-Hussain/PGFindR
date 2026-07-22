import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || 'https://eqoipazlemmsleqnkzfg.supabase.co') as string
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxb2lwYXpsZW1tc2xlcW5remZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3ODQyMjQsImV4cCI6MjA5NzM2MDIyNH0.J8N54JnBBPLf9wPK4fb_5TPJF_qyD06o73NQ4FtC0mQ') as string

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'public' },
})

// Untyped client for dynamic table access
export const supabaseUntyped = createClient(supabaseUrl, supabaseAnonKey)
