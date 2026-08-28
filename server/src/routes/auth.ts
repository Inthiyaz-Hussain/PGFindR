import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { supabase, getSupabaseClient } from '../index.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'
import { z } from 'zod'
import { validateRequest } from '../middleware/validation.js'
import { authRateLimiter } from '../middleware/rateLimiter.js'

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address'),
    mobile: z.string().optional(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['seeker', 'owner']),
  })
})

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  })
})

const verifyOtpSchema = z.object({
  body: z.object({
    phone: z.string().min(1, 'Phone is required'),
    token: z.string().min(1, 'Token is required'),
  })
})

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

router.post('/register', authRateLimiter, validateRequest(registerSchema), async (req, res) => {
  const { name, email, mobile, password, role }: RegisterBody = req.body

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

  if (session?.session?.access_token) {
    res.cookie('sb-access-token', session.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 3600 * 1000 // 30 days
    })
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

// ─── POST /api/auth/admin/create-owner ───────────────────────────────────────

interface CreateOwnerBody {
  name: string
  email: string
  password: string
  mobile?: string
  phone_alternate?: string
}

router.post('/admin/create-owner', authenticateToken, requireRole('admin'), async (req, res) => {
  const { name, email, password, mobile, phone_alternate }: CreateOwnerBody = req.body

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }

  try {
    let createdUser: any = null
    let createErr: any = null

    // Try creating via admin API first (requires email confirmation OTP/link)
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: {
          full_name: name,
          role: 'owner',
        }
      })
      createdUser = data.user
      createErr = error
    } catch (adminApiErr: any) {
      console.warn('Admin createUser failed or service role not configured, trying temp client signup:', adminApiErr.message)
      createErr = adminApiErr
    }

    // Fallback to standard signUp using tempClient if admin API fails or is unauthorized
    if (createErr && (createErr.message.toLowerCase().includes('service_role') || createErr.message.toLowerCase().includes('not allowed') || createErr.status === 401)) {
      console.log('Falling back to standard temp client signUp...')
      const tempClient = createClient(
        process.env.VITE_SUPABASE_URL!,
        process.env.VITE_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } }
      )
      const { data, error: signUpErr } = await tempClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role: 'owner',
          }
        }
      })
      createdUser = data.user
      createErr = signUpErr
    }

    if (createErr) {
      const status = createErr.message.includes('already') ? 409 : 400
      return res.status(status).json({ error: createErr.message })
    }

    // Update the profile row with phone number using the authenticated admin client
    if (createdUser) {
      const db = getSupabaseClient(req)
      await db
        .from('profiles')
        .upsert({ 
          id: createdUser.id,
          full_name: name,
          phone: mobile || null,
          phone_alternate: phone_alternate || null,
          role: 'owner',
          onboarding_verified: false,
          updated_at: new Date().toISOString()
        })

      return res.status(201).json({
        user: {
          id: createdUser.id,
          email: createdUser.email || '',
          name,
          role: 'owner',
          mobile: mobile ?? null,
          phone_alternate: phone_alternate ?? null,
        },
      })
    }

    return res.status(400).json({ error: 'Failed to create owner user' })
  } catch (err: any) {
    console.error('Create owner error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// ─── POST /api/auth/login ────────────────────────────────────────────────────

interface LoginBody {
  email: string
  password: string
}

router.post('/login', authRateLimiter, validateRequest(loginSchema), async (req, res) => {
  const { email, password }: LoginBody = req.body

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

  if (data?.session?.access_token) {
    res.cookie('sb-access-token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 3600 * 1000 // 30 days
    })
  }

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

router.post('/verify-otp', authRateLimiter, validateRequest(verifyOtpSchema), async (req, res) => {
  const { phone, token }: VerifyOtpBody = req.body

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

  if (data?.session?.access_token) {
    res.cookie('sb-access-token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 3600 * 1000 // 30 days
    })
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

// ─── POST /api/auth/register-owner ───────────────────────────────────────────

interface RegisterOwnerBody {
  fullName: string
  mobile: string
  mobileAlternate?: string
  pgName: string
  address: string
  pincode: string
  email: string
}

router.post('/register-owner', authenticateToken, async (req: any, res) => {
  try {
    const { fullName, mobile, mobileAlternate, pgName, address, pincode, email }: RegisterOwnerBody = req.body

    if (!fullName || !mobile || !pgName || !address || !pincode || !email) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    if (req.user?.email !== email) {
      return res.status(400).json({ error: 'Google account email does not match registration email' })
    }

    // 1. Update the user profile
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({
        role: 'owner',
        full_name: fullName,
        phone: mobile,
        phone_alternate: mobileAlternate || null,
        google_uid: req.user.id,
        google_verified: true,
        google_verified_at: new Date().toISOString(),
        onboarding_verified: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id)

    if (profileErr) throw profileErr

    // 2. Create the initial PG listing
    const { data: pg, error: pgErr } = await supabase
      .from('pg_listings')
      .insert({
        owner_id: req.user.id,
        name: pgName,
        address: `${address}, Pincode: ${pincode}`,
        city: 'Bengaluru', // Default city to be edited during onboarding steps
        locality: 'Pending Onboarding', // Default locality to be edited
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (pgErr) throw pgErr

    return res.status(201).json({
      message: 'Owner registration successful',
      user: {
        id: req.user.id,
        email: req.user.email,
        role: 'owner',
        full_name: fullName,
      },
      pg_id: pg?.id
    })
  } catch (err: any) {
    console.error('Owner registration error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
})
router.post('/admin/confirm-email', async (req: any, res) => {
  const { email } = req.body
  if (!email) {
    return res.status(400).json({ error: 'Email is required' })
  }

  try {
    const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers()
    if (listErr) throw listErr
    const user = users.find((u) => u.email === email)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const { error: updateErr } = await supabase.auth.admin.updateUserById(user.id, {
      email_confirm: true
    })
    if (updateErr) throw updateErr

    return res.status(200).json({ message: 'Email confirmed successfully' })
  } catch (err: any) {
    console.error('Confirm email error:', err)
    return res.status(500).json({ error: err.message })
  }
})

router.post('/admin/verify-owner', authenticateToken, requireRole('admin'), async (req: any, res) => {
  const { ownerId, verify } = req.body
  if (!ownerId) {
    return res.status(400).json({ error: 'Owner ID is required' })
  }

  try {
    const dbClient = getSupabaseClient(req)
    const { error: updateErr } = await dbClient
      .from('profiles')
      .update({
        onboarding_verified: verify,
        onboarding_verified_at: verify ? new Date().toISOString() : null
      })
      .eq('id', ownerId)

    if (updateErr) throw updateErr

    let actionLink = null
    let ownerEmail = ''

    // Fetch the owner email from profiles table first
    const { data: profileData } = await dbClient
      .from('profiles')
      .select('email')
      .eq('id', ownerId)
      .single()

    ownerEmail = profileData?.email || ''

    if (verify) {
      const { data: user, error: userErr } = await supabase.auth.admin.getUserById(ownerId)
      if (userErr) {
        console.error('Failed to fetch user auth record:', userErr.message)
      } else if (user?.user?.email) {
        ownerEmail = user.user.email
      }

      if (ownerEmail) {
        let clientUrl = req.headers?.origin
        if (!clientUrl && req.headers?.referer) {
          try {
            clientUrl = new URL(req.headers.referer).origin
          } catch (e) { }
        }
        if (!clientUrl) {
          clientUrl = process.env.CLIENT_URL
          if (clientUrl && clientUrl.includes(',')) {
            clientUrl = clientUrl.split(',')[0].trim()
          }
        }
        
        // Override outdated URL
        if (clientUrl && clientUrl.includes('swiftpg.vercel.app')) {
          clientUrl = clientUrl.replace('swiftpg.vercel.app', 'findpgr.vercel.app')
        }
        
        if (!clientUrl || clientUrl.includes('localhost') || clientUrl.includes('127.0.0.1')) {
          if (process.env.NODE_ENV === 'production') {
            clientUrl = 'https://findpgr.vercel.app'
          } else {
            clientUrl = clientUrl || 'http://localhost:5173'
          }
        }
        const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
          type: 'recovery',
          email: ownerEmail,
          options: {
            redirectTo: `${clientUrl}/auth/reset-password`
          }
        })
        if (linkErr) {
          console.error('Failed to generate recovery link:', linkErr.message)
        } else {
          actionLink = linkData?.properties?.action_link || null
        }

        // If actionLink is null (e.g. missing service role key), generate a mock recovery link for local demo testing
        if (!actionLink) {
          actionLink = `${clientUrl}/auth/reset-password?token=mock-token-${ownerId}&email=${encodeURIComponent(ownerEmail)}`
        }

        // Simulate sending password setup email to the owner
        const emailSubject = 'Set Your Password - FindPGRoom Owner Portal'
        const emailBody = `
          Hi,
          
          Your registration request as a PG Owner has been approved by the Admin!
          
          Please click the link below to set your account password and access your dashboard:
          ${actionLink}
          
          After setting your password, you will be able to complete your listing details and submit your KYC verification.
          
          Regards,
          FindPGRoom Admin Team
        `
        console.log(`==================================================`)
        console.log(`SIMULATING EMAIL DISPATCH TO OWNER FOR PASSWORD SETUP`)
        console.log(`TO: ${ownerEmail}`)
        console.log(`SUBJECT: ${emailSubject}`)
        console.log(`BODY: ${emailBody}`)
        console.log(`==================================================`)
      }
    }

    return res.status(200).json({
      message: verify ? 'Owner verified successfully' : 'Owner access revoked',
      actionLink
    })
  } catch (err: any) {
    console.error('Verify owner error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// ─── POST /api/auth/logout ───────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('sb-access-token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  })
  res.json({ success: true, message: 'Logged out successfully' })
})

export default router

