import { Router } from 'express'
import crypto from 'crypto'
import { supabase } from '../index.js'
// Using global fetch (native in Node 18+)
import { authenticateToken, requireRole } from '../middleware/auth.js'
import { sendMail } from '../utils/mailer.js'

const router = Router()

// Anonymous Supabase client for signing in users
import { createClient } from '@supabase/supabase-js'
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
const n8nWebhookUrl = process.env.N8N_WHATSAPP_WEBHOOK_URL || ''
console.log('SUPABASE URL & KEY FOR ANON CLIENT:', supabaseUrl, supabaseAnonKey ? supabaseAnonKey.slice(0, 15) + '...' : 'UNDEFINED')
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey)

// Helper to validate password strength
function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters long.'
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter (A-Z).'
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter (a-z).'
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number (0-9).'
  if (!/[!@#$%^&*]/.test(password)) return 'Password must contain at least one special character (!@#$%^&*).'

  const commonPasswords = ['password123', 'password1', '12345678', 'qwerty123', 'admin123'];
  if (commonPasswords.includes(password.toLowerCase())) {
    return 'Password is too common or easy to guess.';
  }
  return null;
}

// 1. POST /api/owner/inquiry - Submit interest inquiry form (Google Auth Verified)
router.post('/api/owner/inquiry', authenticateToken, async (req: any, res) => {
  try {
    const {
      fullName,
      mobile,
      email,
      pgName,
      pgCity,
      pgAddress,
      pgWhatsappNumber,
      roomCount,
      bedCount,
      referralSource
    } = req.body

    const finalWhatsappNumber = pgWhatsappNumber || mobile

    if (!fullName || !mobile || !email || !pgName || !pgCity || !pgAddress || !finalWhatsappNumber || roomCount === undefined || bedCount === undefined) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    // Google Email Verification
    if (req.user?.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(400).json({ error: 'Please sign in with the Google account matching the email above.' })
    }

    // Duplicate Prevention & Spam Check (30 days for rejected)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: existing, error: existErr } = await supabase
      .from('owner_inquiries')
      .select('*')
      .or(`email.eq.${email},mobile.eq.${mobile}`)
      .order('created_at', { ascending: false })

    if (existErr) throw existErr

    if (existing && existing.length > 0) {
      const activeInquiry = existing.find(i => ['pending_admin_review', 'approved', 'password_sent', 'onboarded'].includes(i.status))
      if (activeInquiry) {
        return res.status(400).json({ error: 'An active inquiry with this email or mobile number already exists.' })
      }

      const rejectedRecent = existing.find(i => i.status === 'rejected' && new Date(i.created_at) >= thirtyDaysAgo)
      if (rejectedRecent) {
        return res.status(400).json({ error: 'The same email or mobile cannot submit a new inquiry within 30 days of rejection.' })
      }
    }

    // Insert new inquiry record
    const { data: inquiry, error: insertErr } = await supabase
      .from('owner_inquiries')
      .insert({
        full_name: fullName,
        mobile,
        email,
        google_uid: req.user.id,
        pg_name: pgName,
        pg_city: pgCity,
        pg_address: pgAddress,
        room_count: Number(roomCount),
        bed_count: Number(bedCount),
        referral_source: referralSource || null,
        admin_notes: pgWhatsappNumber && pgWhatsappNumber !== mobile ? `WhatsApp: ${pgWhatsappNumber}` : null,
        status: 'pending_admin_review'
      })
      .select()
      .single()

    if (insertErr) throw insertErr

    // Insert notifications for all admins
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')

    if (admins && admins.length > 0) {
      const notifications = admins.map(admin => ({
        user_id: admin.id,
        type: 'owner_inquiry_new',
        title: 'New Owner Inquiry',
        body: `${fullName} is interested in listing ${pgName} in ${pgCity}.`,
        data: { inquiry_id: inquiry.id }
      }))
      await supabase.from('notifications').insert(notifications)
    }

    return res.status(201).json({
      message: 'Inquiry submitted successfully',
      inquiry
    })
  } catch (err: any) {
    console.error('Submit inquiry error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// 2. GET /api/admin/owner-inquiries - List all owner inquiries with filters and pagination
router.get('/api/admin/owner-inquiries', authenticateToken, requireRole('admin'), async (req: any, res) => {
  try {
    const { status, city, date_start, date_end, page = 1, limit = 10 } = req.query
    const pageNum = Number(page)
    const limitNum = Number(limit)

    let query = supabase
      .from('owner_inquiries')
      .select('*', { count: 'exact' })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    if (city && city !== 'all') {
      query = query.eq('pg_city', city)
    }
    if (date_start) {
      query = query.gte('created_at', date_start)
    }
    if (date_end) {
      query = query.lte('created_at', date_end)
    }

    query = query.order('created_at', { ascending: false })

    const from = (pageNum - 1) * limitNum
    const to = from + limitNum - 1
    query = query.range(from, to)

    const { data, count, error } = await query
    if (error) throw error

    return res.json({
      data: data || [],
      total: count || 0,
      page: pageNum,
      limit: limitNum
    })
  } catch (err: any) {
    console.error('List inquiries error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// 3. GET /api/admin/owner-inquiries/:id - Get full inquiry detail for one owner
router.get('/api/admin/owner-inquiries/:id', authenticateToken, requireRole('admin'), async (req: any, res) => {
  try {
    const { id } = req.params
    const { data, error } = await supabase
      .from('owner_inquiries')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    if (!data) {
      return res.status(404).json({ error: 'Inquiry not found' })
    }

    return res.json(data)
  } catch (err: any) {
    console.error('Get inquiry detail error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// 4. PUT /api/admin/owner-inquiries/:id/approve - Approve inquiry — triggers Set Password email
router.put('/api/admin/owner-inquiries/:id/approve', authenticateToken, requireRole('admin'), async (req: any, res) => {
  try {
    const { id } = req.params

    const { data: inquiry, error: fetchErr } = await supabase
      .from('owner_inquiries')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchErr || !inquiry) {
      return res.status(404).json({ error: 'Inquiry not found' })
    }

    const token = crypto.randomBytes(32).toString('hex') // 64 hex characters
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // 24 hours expiry

    const { error: updateErr } = await supabase
      .from('owner_inquiries')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: req.user.id,
        reset_token: token,
        reset_token_expires_at: expiresAt.toISOString(),
        reset_token_used: false
      })
      .eq('id', id)

    if (updateErr) throw updateErr

    // Determine client URL dynamically from request origin/referer if available
    let clientUrl = req.headers.origin
    if (!clientUrl && req.headers.referer) {
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
    // Safe fallbacks to prevent localhost leaking in production email templates
    const isLocalhostRequest = !!(req.headers.host?.includes('localhost') || req.headers.host?.includes('127.0.0.1'))
    if (!clientUrl || clientUrl.includes('localhost') || clientUrl.includes('127.0.0.1')) {
      if (!isLocalhostRequest || process.env.NODE_ENV === 'production') {
        clientUrl = 'https://findpgr.vercel.app'
      } else {
        clientUrl = clientUrl || 'http://localhost:5173'
      }
    }

    const setPasswordLink = `${clientUrl}/owner/set-password?token=${token}`

    const emailSubject = `FindPGRoom - Your Owner Account Has Been Approved - Set Your Password`
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5; margin-bottom: 20px;">Hello ${inquiry.full_name},</h2>
        <p style="font-size: 16px; line-height: 1.6; color: #334155;">
          Your PG listing inquiry for <strong>${inquiry.pg_name}</strong> in <strong>${inquiry.pg_city}</strong> has been reviewed and approved by the FindPGRoom team.
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #334155; margin-top: 20px; margin-bottom: 20px;">
          Please click the button below to configure your FindPGRoom owner account password. This link is valid for 24 hours only:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${setPasswordLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px; display: inline-block;">Set Your Password</a>
        </div>
        <p style="font-size: 14px; line-height: 1.6; color: #64748b; word-break: break-all;">
          Or copy and paste this link in your browser:<br/>
          <a href="${setPasswordLink}" style="color: #4f46e5;">${setPasswordLink}</a>
        </p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="font-size: 12px; line-height: 1.6; color: #94a3b8;">
          If you did not request this, please ignore this email or contact support@findpgroom.in
        </p>
      </div>
    `

    console.log(`\n=========================================`)
    console.log(`SIMULATING EMAIL DISPATCH TO OWNER: ${inquiry.email}`)
    console.log(`Subject: ${emailSubject}`)
    console.log(`Set Password Link: ${setPasswordLink}`)
    console.log(`=========================================\n`)

    // Send email synchronously to ensure it completes on production (e.g. Render)
    const emailResult = await sendMail(inquiry.email, emailSubject, emailHtml);
    if (!emailResult.success) {
      console.error(`❌ Email dispatch failed for ${inquiry.email}`);
      return res.status(500).json({ error: `Failed to send password setup email: ${emailResult.error || 'Check your SMTP configuration.'}` });
    }

    // Trigger n8n WhatsApp webhook
    // HOLD WHATSAPP WEBHOOK FOR NOW
    /*
    let whatsappNumberToUse = inquiry.mobile;
    if (inquiry.admin_notes && inquiry.admin_notes.includes('WhatsApp:')) {
      const match = inquiry.admin_notes.match(/WhatsApp:\s*(\+?\d+)/);
      if (match) {
        whatsappNumberToUse = match[1];
      }
    }

    if (n8nWebhookUrl && whatsappNumberToUse) {
      let sanitizedPhoneNumber = whatsappNumberToUse.replace(/[\D]/g, ''); // Extract only digits
      if (sanitizedPhoneNumber.length === 10) {
        sanitizedPhoneNumber = '91' + sanitizedPhoneNumber;
      } else if (sanitizedPhoneNumber.length === 12 && sanitizedPhoneNumber.startsWith('91')) {
         // It already has 91, which is fine
      }
      
      const webhookPayload = {
        ownerName: inquiry.full_name,
        pgName: inquiry.pg_name,
        phoneNumber: sanitizedPhoneNumber,
        setPasswordUrl: setPasswordLink,
        // New Meta WhatsApp template format variables: "Hi {{1}}, here is the link to access your portal: {{2}}"
        var1: inquiry.full_name,
        var2: setPasswordLink
      };

      console.log('SIMULATING N8N WHATSAPP WEBHOOK DISPATCH:', webhookPayload);

      fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' } as any,
        body: JSON.stringify(webhookPayload)
      })
        .then((response: any) => {
          if (!response.ok) {
            console.error(`❌ n8n WhatsApp webhook failed for ${inquiry.email} with status: ${response.status}`);
          }
        })
        .catch((err: any) => console.error(`❌ n8n WhatsApp webhook dispatch failed for ${inquiry.email}:`, err));
    }
    */

    return res.json({
      message: 'Inquiry approved and Set Password email triggered.',
      emailSent: true,
      token,
      email: inquiry.email
    })
  } catch (err: any) {
    console.error('Approve inquiry error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// 5. DELETE /api/admin/owner-inquiries/:id - Delete an owner inquiry
router.delete('/api/admin/owner-inquiries/:id', authenticateToken, requireRole('admin'), async (req: any, res) => {
  try {
    const { id } = req.params

    const { error } = await supabase
      .from('owner_inquiries')
      .delete()
      .eq('id', id)

    if (error) throw error

    return res.json({ message: 'Inquiry deleted successfully' })
  } catch (err: any) {
    console.error('Delete inquiry error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// 6. PUT /api/admin/owner-inquiries/:id/reject - Reject inquiry with optional reason note
router.put('/api/admin/owner-inquiries/:id/reject', authenticateToken, requireRole('admin'), async (req: any, res) => {
  try {
    const { id } = req.params
    const { admin_notes } = req.body

    const { error } = await supabase
      .from('owner_inquiries')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: req.user.id,
        admin_notes: admin_notes || null
      })
      .eq('id', id)

    if (error) throw error

    return res.json({ message: 'Inquiry rejected successfully' })
  } catch (err: any) {
    console.error('Reject inquiry error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// 6. PUT /api/admin/owner-inquiries/:id/resend-email - Resend Set Password email if token expired
router.put('/api/admin/owner-inquiries/:id/resend-email', authenticateToken, requireRole('admin'), async (req: any, res) => {
  try {
    const { id } = req.params

    const { data: inquiry, error: fetchErr } = await supabase
      .from('owner_inquiries')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchErr || !inquiry) {
      return res.status(404).json({ error: 'Inquiry not found' })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    const { error: updateErr } = await supabase
      .from('owner_inquiries')
      .update({
        reset_token: token,
        reset_token_expires_at: expiresAt.toISOString(),
        reset_token_used: false,
        status: 'approved'
      })
      .eq('id', id)

    if (updateErr) throw updateErr

    // Determine client URL dynamically from request origin/referer if available
    let clientUrl = req.headers.origin
    if (!clientUrl && req.headers.referer) {
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
    // Safe fallbacks to prevent localhost leaking in production email templates
    const isLocalhostRequest = !!(req.headers.host?.includes('localhost') || req.headers.host?.includes('127.0.0.1'))
    if (!clientUrl || clientUrl.includes('localhost') || clientUrl.includes('127.0.0.1')) {
      if (!isLocalhostRequest || process.env.NODE_ENV === 'production') {
        clientUrl = 'https://findpgr.vercel.app'
      } else {
        clientUrl = clientUrl || 'http://localhost:5173'
      }
    }

    const setPasswordLink = `${clientUrl}/owner/set-password?token=${token}`

    const emailSubject = `FindPGRoom - Your Owner Account Has Been Approved - Set Your Password (Resend)`
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5; margin-bottom: 20px;">Hello ${inquiry.full_name},</h2>
        <p style="font-size: 16px; line-height: 1.6; color: #334155;">
          Your PG listing inquiry for <strong>${inquiry.pg_name}</strong> in <strong>${inquiry.pg_city}</strong> has been reviewed and approved by the FindPGRoom team.
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #334155; margin-top: 20px; margin-bottom: 20px;">
          Please click the button below to configure your FindPGRoom owner account password. This link is valid for 24 hours only:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${setPasswordLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px; display: inline-block;">Set Your Password</a>
        </div>
        <p style="font-size: 14px; line-height: 1.6; color: #64748b; word-break: break-all;">
          Or copy and paste this link in your browser:<br/>
          <a href="${setPasswordLink}" style="color: #4f46e5;">${setPasswordLink}</a>
        </p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="font-size: 12px; line-height: 1.6; color: #94a3b8;">
          If you did not request this, please ignore this email or contact support@findpgroom.in
        </p>
      </div>
    `

    console.log(`\n=========================================`)
    console.log(`SIMULATING EMAIL DISPATCH (RESEND) TO OWNER: ${inquiry.email}`)
    console.log(`Subject: ${emailSubject}`)
    console.log(`Set Password Link: ${setPasswordLink}`)
    console.log(`=========================================\n`)

    // Send email synchronously to ensure it completes on production (e.g. Render)
    const emailResult = await sendMail(inquiry.email, emailSubject, emailHtml);
    if (!emailResult.success) {
      console.error(`❌ Email dispatch failed for ${inquiry.email}`);
      return res.status(500).json({ error: `Failed to resend password setup email: ${emailResult.error || 'Check your SMTP configuration.'}` });
    }

    // Trigger n8n WhatsApp webhook
    // HOLD WHATSAPP WEBHOOK FOR NOW
    /*
    let whatsappNumberToUse = inquiry.mobile;
    if (inquiry.admin_notes && inquiry.admin_notes.includes('WhatsApp:')) {
      const match = inquiry.admin_notes.match(/WhatsApp:\s*(\+?\d+)/);
      if (match) {
        whatsappNumberToUse = match[1];
      }
    }

    if (n8nWebhookUrl && whatsappNumberToUse) {
      let sanitizedPhoneNumber = whatsappNumberToUse.replace(/[\D]/g, ''); // Extract only digits
      if (sanitizedPhoneNumber.length === 10) {
        sanitizedPhoneNumber = '91' + sanitizedPhoneNumber;
      } else if (sanitizedPhoneNumber.length === 12 && sanitizedPhoneNumber.startsWith('91')) {
         // It already has 91, which is fine
      }
      
      const webhookPayload = {
        ownerName: inquiry.full_name,
        pgName: inquiry.pg_name,
        phoneNumber: sanitizedPhoneNumber,
        setPasswordUrl: setPasswordLink,
        // New Meta WhatsApp template format variables: "Hi {{1}}, here is the link to access your portal: {{2}}"
        var1: inquiry.full_name,
        var2: setPasswordLink
      };

      console.log('SIMULATING N8N WHATSAPP WEBHOOK DISPATCH (RESEND):', webhookPayload);

      fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' } as any,
        body: JSON.stringify(webhookPayload)
      })
        .then((response: any) => {
          if (!response.ok) {
            console.error(`❌ n8n WhatsApp webhook failed for ${inquiry.email} with status: ${response.status}`);
          }
        })
        .catch((err: any) => console.error(`❌ n8n WhatsApp webhook dispatch failed for ${inquiry.email}:`, err));
    }
    */

    return res.json({
      message: 'Set Password email triggered successfully.',
      emailSent: true,
      token,
      email: inquiry.email
    })
  } catch (err: any) {
    console.error('Resend email error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// 7. GET /api/owner/set-password - Validate token on Set Password page load
router.get('/api/owner/set-password', async (req: any, res) => {
  try {
    const { token } = req.query
    if (!token) {
      return res.status(400).json({ error: 'Token is required' })
    }

    const { data: inquiry, error } = await supabase
      .from('owner_inquiries')
      .select('*')
      .eq('reset_token', token)
      .single()

    if (error || !inquiry) {
      return res.status(400).json({ error: 'This link has expired or is invalid. Please contact support@findpgroom.in' })
    }

    if (inquiry.reset_token_used) {
      return res.status(400).json({ error: 'This link has already been used. Please log in.' })
    }

    const expiryTime = new Date(inquiry.reset_token_expires_at).getTime()
    if (Date.now() > expiryTime) {
      return res.status(400).json({ error: 'This link has expired. Please contact support@findpgroom.in to resend.' })
    }

    if (inquiry.status !== 'approved' && inquiry.status !== 'password_sent') {
      return res.status(400).json({ error: 'Inquiry has been revoked or status changed.' })
    }

    return res.json({
      valid: true,
      email: inquiry.email,
      fullName: inquiry.full_name,
      pgName: inquiry.pg_name
    })
  } catch (err: any) {
    console.error('Validate token error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// 8. POST /api/owner/set-password - Submit new password — runs all 7 authenticity checks
router.post('/api/owner/set-password', async (req: any, res) => {
  try {
    const { token, password, confirmPassword } = req.body

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required.' })
    }

    // 1. Fetch inquiry by token
    const { data: inquiry, error: fetchErr } = await supabase
      .from('owner_inquiries')
      .select('*')
      .eq('reset_token', token)
      .single()

    if (fetchErr || !inquiry) {
      return res.status(400).json({ error: 'Invalid link.' })
    }

    // 2. Check token not expired
    const expiryTime = new Date(inquiry.reset_token_expires_at).getTime()
    if (Date.now() > expiryTime) {
      return res.status(400).json({ error: 'Link expired.' })
    }

    // 3. Check token not already used
    if (inquiry.reset_token_used) {
      return res.status(400).json({ error: 'Link already used. Please log in.' })
    }

    // 4. Check inquiry status is approved
    if (inquiry.status !== 'approved' && inquiry.status !== 'password_sent') {
      return res.status(400).json({ error: 'Inquiry may have been revoked by admin.' })
    }

    // 5. Password meets strength rules
    const passwordError = validatePasswordStrength(password)
    if (passwordError) {
      return res.status(400).json({ error: passwordError })
    }

    // 6. Both passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' })
    }

    // 7. Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', inquiry.email)
      .maybeSingle()

    let userId: string

    if (existingUser) {
      // Elevate existing Google/seeker account to owner
      const { data: authUser, error: authErr } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        {
          password,
          user_metadata: {
            full_name: inquiry.full_name,
            role: 'owner'
          }
        }
      )
      if (authErr) throw authErr
      userId = existingUser.id
    } else {
      // Create a brand new account
      const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
        email: inquiry.email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: inquiry.full_name,
          role: 'owner'
        }
      })
      if (authErr) throw authErr
      if (!authUser?.user) {
        return res.status(500).json({ error: 'Failed to create user account' })
      }
      userId = authUser.user.id
    }

    const { error: profileErr } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        role: 'owner',
        full_name: inquiry.full_name,
        email: inquiry.email,
        phone: inquiry.mobile,
        onboarding_verified: false, // Must complete onboarding wizard
        kyc_status: 'pending',
        listing_status: 'hidden'
      })

    if (profileErr) throw profileErr

    // Update inquiry record status to onboarded
    const { error: inquiryUpdateErr } = await supabase
      .from('owner_inquiries')
      .update({
        reset_token_used: true,
        password_set_at: new Date().toISOString(),
        owner_user_id: userId,
        status: 'onboarded'
      })
      .eq('id', inquiry.id)

    if (inquiryUpdateErr) throw inquiryUpdateErr

    // Create the initial PG listing
    const { error: pgErr } = await supabase
      .from('pg_listings')
      .insert({
        owner_id: userId,
        name: inquiry.pg_name,
        address: inquiry.pg_address,
        city: inquiry.pg_city,
        locality: 'Pending Onboarding',
        status: 'pending' // Not visible to seekers until KYC is approved
      })

    if (pgErr) throw pgErr

    return res.json({
      success: true,
      message: 'Account activated successfully!'
    })
  } catch (err: any) {
    console.error('Set password error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// 9. POST /api/auth/owner/login - Login with email + password — returns JWT
router.post('/api/auth/owner/login', async (req: any, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Fetch the profile
    const { data: profile, error: fetchErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle()

    if (fetchErr || !profile) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    if (profile.role !== 'owner') {
      return res.status(403).json({ error: 'Invalid email or password.' })
    }

    // Sign in via Supabase Auth
    const { data, error: loginErr } = await supabaseAnon.auth.signInWithPassword({
      email,
      password
    })

    if (loginErr) {
      console.error('Supabase Auth login error details:', loginErr)
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    return res.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        name: profile.full_name,
        role: profile.role,
        mobile: profile.phone,
        kyc_status: profile.kyc_status || 'pending',
        listing_status: profile.listing_status || 'hidden'
      },
      session: {
        access_token: data.session!.access_token,
        refresh_token: data.session!.refresh_token,
        expires_at: data.session!.expires_at
      }
    })
  } catch (err: any) {
    console.error('Owner login error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// 10. POST /api/owner/pg - Create PG listing (saved but not live until KYC approved)
router.post('/api/owner/pg', authenticateToken, requireRole('owner'), async (req: any, res) => {
  try {
    const { name, description, address, city, pincode, gender } = req.body

    const { data, error } = await supabase
      .from('pg_listings')
      .insert({
        owner_id: req.user.id,
        name,
        description,
        address: `${address}, Pincode: ${pincode}`,
        city,
        locality: 'Pending Verification',
        pg_type: gender || 'co-ed',
        status: 'pending' // Not visible to seekers until KYC is approved
      })
      .select()
      .single()

    if (error) throw error

    return res.status(201).json(data)
  } catch (err: any) {
    console.error('Create PG error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// 11. POST /api/owner/kyc - Submit KYC documents and bank details
router.post('/api/owner/kyc', authenticateToken, requireRole('owner'), async (req: any, res) => {
  try {
    const {
      bankAccountNumber,
      bankIfsc,
      bankHolderName,
      aadhaarNumber, // last 4 digits
      documents // array of { doc_type, url }
    } = req.body

    if (!bankAccountNumber || !bankIfsc || !bankHolderName || !documents || documents.length === 0) {
      return res.status(400).json({ error: 'Bank details and documents are required.' })
    }

    // Extract last 4 digits of Aadhaar
    const aadhaarLast4 = aadhaarNumber ? aadhaarNumber.replace(/[^0-9]/g, '').slice(-4) : null

    // Update profile table
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({
        kyc_status: 'submitted',
        kyc_submitted_at: new Date().toISOString(),
        bank_account_number: bankAccountNumber,
        bank_ifsc: bankIfsc,
        bank_holder_name: bankHolderName,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id)

    if (profileErr) throw profileErr

    // Delete old documents
    const { error: deleteErr } = await supabase
      .from('owner_documents')
      .delete()
      .eq('owner_id', req.user.id)

    if (deleteErr) throw deleteErr

    // Insert new documents
    const docPayloads = documents.map((doc: any) => ({
      owner_id: req.user.id,
      doc_type: doc.doc_type, // 'id_proof', 'address_proof', 'ownership_proof'
      url: doc.url,
      verified: false
    }))

    const { error: docInsertErr } = await supabase
      .from('owner_documents')
      .insert(docPayloads)

    if (docInsertErr) throw docInsertErr

    // Update owner_kyc table (legacy compatibility if other modules depend on it)
    await supabase
      .from('owner_kyc')
      .upsert({
        owner_id: req.user.id,
        pan_number: 'N/A', // Collected under id_proof files now
        aadhaar_number: aadhaarLast4,
        bank_account: bankAccountNumber,
        bank_ifsc: bankIfsc,
        bank_name: bankHolderName,
        status: 'pending',
        updated_at: new Date().toISOString()
      })

    return res.json({ success: true, message: 'KYC submitted successfully!' })
  } catch (err: any) {
    console.error('Submit KYC error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// 12. GET /api/admin/kyc-queue - List all pending KYC submissions
router.get('/api/admin/kyc-queue', authenticateToken, requireRole('admin'), async (req: any, res) => {
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*, documents:owner_documents(*), pgs:pg_listings(*, rooms(*, beds(*)), amenities(*))')
      .eq('kyc_status', 'submitted')
      .order('kyc_submitted_at', { ascending: false })

    if (error) throw error

    const queue = (profiles || []).map((p: any) => ({
      owner_id: p.id,
      full_name: p.full_name,
      email: p.email,
      mobile: p.phone,
      kyc_submitted_at: p.kyc_submitted_at,
      document_count: p.documents?.length || 0,
      documents: p.documents || [],
      bank: {
        bank_account_number: p.bank_account_number,
        bank_ifsc: p.bank_ifsc,
        bank_holder_name: p.bank_holder_name
      },
      pg_name: p.pgs?.[0]?.name || 'N/A',
      pg_details: p.pgs?.[0] || null
    }))

    return res.json(queue)
  } catch (err: any) {
    console.error('Get KYC queue error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// 13. PUT /api/admin/kyc/:owner_id/approve - Approve KYC — activates listing and full dashboard
router.put('/api/admin/kyc/:owner_id/approve', authenticateToken, requireRole('admin'), async (req: any, res) => {
  try {
    const { owner_id } = req.params

    const { error: profileErr } = await supabase
      .from('profiles')
      .update({
        kyc_status: 'approved',
        listing_status: 'active',
        kyc_reviewed_at: new Date().toISOString(),
        kyc_reviewed_by: req.user.id
      })
      .eq('id', owner_id)

    if (profileErr) throw profileErr

    // Activate the owner's listings (pending -> approved)
    const { error: pgErr } = await supabase
      .from('pg_listings')
      .update({ status: 'approved' })
      .eq('owner_id', owner_id)
      .eq('status', 'pending')

    if (pgErr) throw pgErr

    // Update documents to verified
    await supabase
      .from('owner_documents')
      .update({ verified: true })
      .eq('owner_id', owner_id)

    // Update legacy owner_kyc status
    await supabase
      .from('owner_kyc')
      .update({ status: 'approved' })
      .eq('owner_id', owner_id)

    // Fetch owner email
    const { data: owner } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', owner_id)
      .single()

    // Simulate approval notification
    console.log(`\n=========================================`)
    console.log(`SIMULATING KYC APPROVAL EMAIL DISPATCH TO OWNER: ${owner?.email}`)
    console.log(`Subject: Congratulations! Your FindPGRoom Account is Fully Verified`)
    console.log(`Body:`)
    console.log(`Hello ${owner?.full_name},`)
    console.log(`Congratulations! Your KYC documents and bank details have been verified by our team.`)
    console.log(`Your PG listings are now active and visible to seekers. All dashboard features are unlocked.`)
    console.log(`=========================================\n`)

    return res.json({ success: true, message: 'Owner KYC approved and listings activated.' })
  } catch (err: any) {
    console.error('Approve KYC error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// 14. PUT /api/admin/kyc/:owner_id/request-resubmit - Request specific document resubmission
router.put('/api/admin/kyc/:owner_id/request-resubmit', authenticateToken, requireRole('admin'), async (req: any, res) => {
  try {
    const { owner_id } = req.params
    const { notes, documentTypes } = req.body // documentTypes is array of doc_type like ['id_proof']

    if (!notes) {
      return res.status(400).json({ error: 'Rejection/resubmission note is required.' })
    }

    const { error: profileErr } = await supabase
      .from('profiles')
      .update({
        kyc_status: 'resubmission_requested',
        kyc_notes: notes,
        kyc_reviewed_at: new Date().toISOString(),
        kyc_reviewed_by: req.user.id
      })
      .eq('id', owner_id)

    if (profileErr) throw profileErr

    // Update legacy owner_kyc status to rejected
    await supabase
      .from('owner_kyc')
      .update({ status: 'rejected', admin_notes: notes })
      .eq('owner_id', owner_id)

    // Fetch owner email
    const { data: owner } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', owner_id)
      .single()

    // Simulate resubmission request email
    console.log(`\n=========================================`)
    console.log(`SIMULATING KYC RESUBMISSION REQUEST EMAIL TO OWNER: ${owner?.email}`)
    console.log(`Subject: Action Required: Please Resubmit Your KYC Documents`)
    console.log(`Body:`)
    console.log(`Hello ${owner?.full_name},`)
    console.log(`Our team reviewed your KYC details. Unfortunately, some documents need to be resubmitted.`)
    console.log(`Document types required: ${documentTypes?.join(', ') || 'All Proofs'}`)
    console.log(`Reason / Admin Notes: ${notes}`)
    console.log(`Please log into your dashboard and resubmit the requested items.`)
    console.log(`=========================================\n`)

    return res.json({ success: true, message: 'KYC resubmission requested.' })
  } catch (err: any) {
    console.error('Request resubmit error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// 14.2. POST /api/admin/kyc/send-reminders - Send KYC reminding notifications to all owners who have not submitted yet
router.post('/api/admin/kyc/send-reminders', authenticateToken, requireRole('admin'), async (req: any, res) => {
  try {
    // Fetch all owners
    const { data: owners, error: fetchError } = await supabase
      .from('profiles')
      .select('id, full_name, email, kyc_status')
      .eq('role', 'owner')

    if (fetchError) throw fetchError

    // Filter to those with pending or null KYC status
    const pendingOwners = (owners || []).filter(o => !o.kyc_status || o.kyc_status === 'pending')

    if (pendingOwners.length === 0) {
      return res.json({ success: true, count: 0, message: 'No owners found with pending KYC documents.' })
    }

    const notifications = pendingOwners.map((owner: any) => ({
      user_id: owner.id,
      type: 'general',
      title: 'KYC Submission Mandatory - Urgent Action Required',
      body: `Dear ${owner.full_name || 'Owner'}, KYC verification and document submission are strictly mandatory. Please log into your owner portal and upload your ID proof, address proof, and property ownership documents within the next 48 hours to prevent listing suspension.`,
      data: { action: 'kyc_submission_required' },
      read: false
    }))

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications)

    if (insertError) throw insertError

    return res.json({ success: true, count: pendingOwners.length, message: `KYC reminders successfully sent to ${pendingOwners.length} owners.` })
  } catch (err: any) {
    console.error('Send KYC reminders error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// 14.5. POST /api/owner/onboard - Complete onboarding & KYC direct submission
router.post('/api/owner/onboard', authenticateToken, requireRole('owner'), async (req: any, res) => {
  try {
    const {
      pgDetails,
      rooms,
      standardAmenities,
      customAmenities,
      commonPhotos,
      kycDetails,
      documents
    } = req.body

    const userId = req.user.id

    // A. Update profiles table to set onboarding_verified = true and submit KYC
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({
        onboarding_verified: true,
        onboarding_verified_at: new Date().toISOString(),
        kyc_status: 'submitted',
        kyc_submitted_at: new Date().toISOString(),
        bank_account_number: kycDetails.bank_account,
        bank_ifsc: kycDetails.bank_ifsc,
        bank_holder_name: kycDetails.bank_name,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (profileErr) throw profileErr

    // B. Get the blank PG listing created during registration
    const { data: pg, error: pgFetchErr } = await supabase
      .from('pg_listings')
      .select('id')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (pgFetchErr) throw pgFetchErr
    const pgId = pg.id

    // Calculate PG listing summary stats
    let totalBeds = 0
    let occupiedBeds = 0
    let minRent = Infinity
    let maxRent = -Infinity

    if (rooms && Array.isArray(rooms)) {
      for (const room of rooms) {
        const roomTotal = room.beds?.length || 0
        const roomOccupied = room.beds?.filter((b: any) => b.status === 'occupied').length || 0
        totalBeds += roomTotal
        occupiedBeds += roomOccupied

        if (room.beds && Array.isArray(room.beds)) {
          for (const bed of room.beds) {
            const rent = Number(bed.monthly_rent) || 0
            if (rent < minRent) minRent = rent
            if (rent > maxRent) maxRent = rent
          }
        }
      }
    }

    const availableBeds = totalBeds - occupiedBeds
    const monthlyRentMin = minRent === Infinity ? 0 : minRent
    const monthlyRentMax = maxRent === -Infinity ? 0 : maxRent

    // C. Update PG listing with full basic details
    const { error: pgUpdateErr } = await supabase
      .from('pg_listings')
      .update({
        name: pgDetails.name,
        description: pgDetails.description,
        address: pgDetails.address,
        city: pgDetails.city,
        locality: pgDetails.locality,
        pincode: pgDetails.pincode || null,
        pg_type: pgDetails.pg_type,
        deposit_amount: Number(pgDetails.deposit_amount) || 5000,
        rules: pgDetails.rules || '',
        near_malls: pgDetails.near_malls || null,
        near_parks: pgDetails.near_parks || null,
        near_pubs: pgDetails.near_pubs || null,
        near_transit: pgDetails.near_transit || null,
        status: 'pending', // Re-submit for review
        total_beds: totalBeds,
        available_beds: availableBeds,
        monthly_rent_min: monthlyRentMin,
        monthly_rent_max: monthlyRentMax,
        updated_at: new Date().toISOString()
      })
      .eq('id', pgId)

    if (pgUpdateErr) throw pgUpdateErr

    // Delete any older duplicate placeholder listings for this owner to keep portal data in sync
    await supabase
      .from('pg_listings')
      .delete()
      .eq('owner_id', userId)
      .eq('locality', 'Pending Onboarding')
      .neq('id', pgId)

    // D. Setup Sharing Types & Rooms & Beds
    // Delete any existing room configurations to rebuild clean
    await supabase.from('rooms').delete().eq('pg_id', pgId)
    await supabase.from('beds').delete().eq('pg_id', pgId)

    if (rooms && rooms.length > 0) {
      // 1. Batch upsert sharing types
      const sharingTypesToUpsert = rooms.map((room: any) => ({
        pg_id: pgId,
        type: room.sharing_type,
        price_monthly: room.beds?.[0]?.monthly_rent || 10000,
        total_beds: room.beds?.length || 0,
        occupied_beds: room.beds?.filter((b: any) => b.status === 'occupied').length || 0,
      }))
      
      const uniqueTypes = [...new Map(sharingTypesToUpsert.map((item: any) => [item.type, item])).values()]
      
      const { data: upsertedSharingTypes, error: stErr } = await supabase
        .from('sharing_types')
        .upsert(uniqueTypes, { onConflict: 'pg_id,type' })
        .select('id, type')
        
      if (stErr) throw stErr
      
      const typeIdMap: Record<number, string> = {}
      upsertedSharingTypes?.forEach((st: any) => {
        typeIdMap[st.type] = st.id
      })

      // 2. Batch insert rooms
      const roomsToInsert = rooms.map((room: any) => ({
        pg_id: pgId,
        sharing_type_id: typeIdMap[room.sharing_type],
        room_label: room.room_label,
        floor: room.floor,
        door_facing: room.door_facing,
        has_window: room.has_window,
        window_facing: room.window_facing || null,
        window_count: room.window_count || null,
        room_size_sqft: room.room_size_sqft || null,
        room_notes: room.room_notes || null
      }))

      const { data: insertedRooms, error: rmErr } = await supabase
        .from('rooms')
        .insert(roomsToInsert)
        .select('id, room_label')

      if (rmErr) throw rmErr
      
      const roomLabelToIdMap: Record<string, string> = {}
      insertedRooms?.forEach((rm: any) => {
        roomLabelToIdMap[rm.room_label] = rm.id
      })

      // 3. Batch insert beds
      const allBedInserts: any[] = []
      for (const room of rooms) {
        const rmId = roomLabelToIdMap[room.room_label]
        const sharingTypeLabel = room.sharing_type === 1 ? 'single' : room.sharing_type === 2 ? 'double' : room.sharing_type === 3 ? 'triple' : 'dormitory'
        
        if (room.beds && Array.isArray(room.beds)) {
          const bedInserts = room.beds.map((bed: any) => ({
            pg_id: pgId,
            room_id: rmId,
            room_number: room.room_label, // Legacy compatibility
            bed_label: bed.bed_label,
            sharing_type: sharingTypeLabel, // Legacy compatibility
            monthly_rent: bed.monthly_rent,
            status: bed.status,
            floor_number: room.floor, // Legacy compatibility
            has_ac: standardAmenities.ac || false, // Legacy compatibility
            has_attached_bath: false, // Legacy compatibility
            bed_type: bed.bed_type,
          }))
          allBedInserts.push(...bedInserts)
        }
      }

      if (allBedInserts.length > 0) {
        // Chunk inserts to prevent massive payloads if necessary (supabase handles up to thousands easily though)
        const { error: bedErr } = await supabase.from('beds').insert(allBedInserts)
        if (bedErr) throw bedErr
      }
    }

    // E. Update Standard Amenities
    await supabase.from('amenities').delete().eq('pg_id', pgId)
    const amenityInserts = Object.keys(standardAmenities)
      .filter(key => standardAmenities[key])
      .map(key => ({
        pg_id: pgId,
        key,
        is_available: true
      }))

    if (amenityInserts.length > 0) {
      const { error: amErr } = await supabase.from('amenities').insert(amenityInserts)
      if (amErr) throw amErr
    }

    // F. Insert Custom Amenities
    await supabase.from('custom_amenities').delete().eq('pg_id', pgId)
    if (customAmenities.length > 0) {
      const customInserts = customAmenities.map((label: string) => ({
        pg_id: pgId,
        label,
        created_by: userId
      }))
      const { error: custErr } = await supabase.from('custom_amenities').insert(customInserts)
      if (custErr) throw custErr
    }

    // G. Re-sync files & insert KYC documents
    await supabase.from('owner_documents').delete().eq('owner_id', userId)

    const docInserts = [
      { owner_id: userId, doc_type: 'id_proof', url: documents?.id_proof || 'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=500&q=80', verified: false },
      { owner_id: userId, doc_type: 'address_proof', url: documents?.address_proof || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=500&q=80', verified: false },
      { owner_id: userId, doc_type: 'ownership_proof', url: documents?.ownership_proof || 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=500&q=80', verified: false }
    ]
    const { error: docErr } = await supabase.from('owner_documents').insert(docInserts)
    if (docErr) throw docErr

    // H. Update KYC details table
    await supabase
      .from('owner_kyc')
      .upsert({
        owner_id: userId,
        pan_number: kycDetails.pan_number,
        aadhaar_number: kycDetails.aadhaar_number,
        bank_account: kycDetails.bank_account,
        bank_ifsc: kycDetails.bank_ifsc,
        bank_name: kycDetails.bank_name,
        status: 'pending',
        updated_at: new Date().toISOString()
      }, { onConflict: 'owner_id' })

    // I. Update PG Photos list
    if (commonPhotos && commonPhotos.length > 0) {
      await supabase.from('pg_photos').delete().eq('pg_id', pgId)
      const photoInserts = commonPhotos.map((url: string, index: number) => ({
        pg_id: pgId,
        url,
        is_primary: index === 0,
        sort_order: index,
        type: 'common'
      }))
      const { error: photoErr } = await supabase.from('pg_photos').insert(photoInserts)
      if (photoErr) throw photoErr
    }

    return res.json({ success: true, message: 'Onboarding completed successfully' })
  } catch (err: any) {
    console.error('Server onboard submit error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

export default router
