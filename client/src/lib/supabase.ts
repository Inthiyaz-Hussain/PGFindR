import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || 'https://rmqchbeigldxsczijcst.supabase.co') as string
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcWNoYmVpZ2xkeHNjemlqY3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMjE1OTEsImV4cCI6MjA5NzY5NzU5MX0.L91NRsugTzORyAJLk_F3iPb91KyA-6ay0dXw5BSE2JI') as string

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'public' },
  auth: { flowType: 'implicit' },
})

// Untyped client for dynamic table access
export const supabaseUntyped = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { flowType: 'implicit' },
})
