import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../index.js'

const router = Router()

// Anon client — used for operations that issue user-scoped JWTs
const supabaseAnon = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

// ─── POST /api/auth/register ────────────────────────────────────────────────

interface RegisterBody {
  name: string
  email: string
  mobile?: string
  password: string
  role: 'seeker' | 'owner'
}

router.post('/register', async (req, res) => {
  const { name, email, mobile, password, role }: RegisterBody = req.body

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'name, email, password, and role are required' })
  }
  if (!['seeker', 'owner'].includes(role)) {
    return res.status(400).json({ error: 'role must be "seeker" or "owner"' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }

  // Create user via admin API (auto-confirms email so they can log in immediately)
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, role },
    ...(mobile ? { phone: mobile } : {}),
  })

  if (createErr) {
    const status = createErr.message.includes('already') ? 409 : 400
    return res.status(status).json({ error: createErr.message })
  }

  // Update the auto-created profile row with phone number
  if (mobile && created.user) {
    await supabase
      .from('profiles')
      .update({ phone: mobile })
      .eq('id', created.user.id)
  }

  // Sign in with anon client to obtain a user-scoped JWT
  const { data: session, error: signInErr } = await supabaseAnon.auth.signInWithPassword({
    email,
    password,
  })

  if (signInErr) {
    return res.status(500).json({ error: 'Account created but login failed. Please sign in.' })
  }

  return res.status(201).json({
    user: {
      id: session.user.id,
      email: session.user.email,
      name,
      role,
      mobile: mobile ?? null,
    },
    session: {
      access_token: session.session!.access_token,
      refresh_token: session.session!.refresh_token,
      expires_at: session.session!.expires_at,
    },
  })
})

// ─── POST /api/auth/login ────────────────────────────────────────────────────

interface LoginBody {
  email: string
  password: string
}

router.post('/login', async (req, res) => {
  const { email, password }: LoginBody = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' })
  }

  const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password })

  if (error) {
    return res.status(401).json({ error: error.message })
  }

  // Fetch full profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single()

  return res.json({
    user: {
      id: data.user.id,
      email: data.user.email,
      name: profile?.full_name ?? data.user.user_metadata?.full_name,
      role: profile?.role ?? data.user.user_metadata?.role ?? 'seeker',
      mobile: profile?.phone ?? null,
    },
    session: {
      access_token: data.session!.access_token,
      refresh_token: data.session!.refresh_token,
      expires_at: data.session!.expires_at,
    },
  })
})

// ─── POST /api/auth/verify-otp ───────────────────────────────────────────────

interface VerifyOtpBody {
  phone: string
  token: string
}

router.post('/verify-otp', async (req, res) => {
  const { phone, token }: VerifyOtpBody = req.body

  if (!phone || !token) {
    return res.status(400).json({ error: 'phone and token are required' })
  }

  const { data, error } = await supabaseAnon.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  })

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  // Mark profile phone as verified by updating the phone field
  if (data.user) {
    await supabase
      .from('profiles')
      .update({ phone })
      .eq('id', data.user.id)
  }

  return res.json({
    verified: true,
    user: {
      id: data.user?.id,
      email: data.user?.email,
    },
    session: data.session
      ? {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
        }
      : null,
  })
})

export default router
