import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../index.js'
import { sendPushNotification } from '../lib/firebase.js'
import { createNotification, getUserFcmToken } from '../lib/notifications.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

async function getPlatformSettings() {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('*')
  if (error) {
    console.error('Error loading platform settings:', error)
    return {}
  }
  return (data || []).reduce((acc: Record<string, string>, item: any) => {
    acc[item.key] = item.value
    return acc
  }, {})
}

function calculateCommissionRate(monthlyRent: number, settings: Record<string, string>): number {
  const tier1Max = parseInt(settings['commission_tier_1_max_rent'] || '5000', 10)
  const tier1Rate = parseFloat(settings['commission_tier_1_rate'] || '8.00')
  const tier2Max = parseInt(settings['commission_tier_2_max_rent'] || '10000', 10)
  const tier2Rate = parseFloat(settings['commission_tier_2_rate'] || '10.00')
  const tier3Rate = parseFloat(settings['commission_tier_3_rate'] || '12.00')

  if (monthlyRent <= tier1Max) {
    return tier1Rate
  } else if (monthlyRent <= tier2Max) {
    return tier2Rate
  } else {
    return tier3Rate
  }
}

// GET /api/inquiry - List inquiries (filtered by user role)
router.get('/', async (req, res) => {
  try {
    const { user_id, owner_id } = req.query

    let query = supabase
      .from('inquiries')
      .select('*, pg:pg_listings(name, city, locality), seeker:profiles!inquiries_seeker_id_fkey(full_name, phone)')
      .order('created_at', { ascending: false })

    // If owner_id is passed, filter by their PGs
    if (owner_id) {
      const { data: ownerPGs } = await supabase
        .from('pg_listings')
        .select('id')
        .eq('owner_id', owner_id as string)

      const pgIds = ownerPGs?.map(pg => pg.id) || []
      query = query.in('pg_id', pgIds)
    } else if (user_id) {
      query = query.eq('seeker_id', user_id as string)
    }

    const { data, error } = await query

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// GET /api/inquiry/:id - Get single inquiry
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('inquiries')
      .select('*, pg:pg_listings(*), seeker:profiles!inquiries_seeker_id_fkey(full_name, phone, email), bed:beds(*)')
      .eq('id', req.params.id)
      .single()

    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Inquiry not found' })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// POST /api/inquiry - Create new inquiry (authenticated seekers only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      pg_id,
      seeker_id,
      full_name,
      mobile,
      age,
      move_in_date,
      sharing_preference,
      occupation,
      city_of_origin,
      duration_value,
      duration_unit,
      message,
    } = req.body

    // Validation
    if (!pg_id || typeof pg_id !== 'string') {
      return res.status(400).json({ error: 'pg_id is required' })
    }
    if (!seeker_id || typeof seeker_id !== 'string') {
      return res.status(400).json({ error: 'seeker_id is required' })
    }
    if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
      return res.status(400).json({ error: 'Full name is required (min 2 chars)' })
    }
    if (!mobile || !/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ error: 'Mobile must be exactly 10 digits' })
    }
    if (age === undefined || age === null || age < 18 || age > 60) {
      return res.status(400).json({ error: 'Age must be between 18 and 60' })
    }
    if (!move_in_date) {
      return res.status(400).json({ error: 'Move-in date is required' })
    }
    const moveIn = new Date(move_in_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (moveIn < today) {
      return res.status(400).json({ error: 'Move-in date cannot be in the past' })
    }
    if (!sharing_preference || ![1, 2, 3, 4].includes(Number(sharing_preference))) {
      return res.status(400).json({ error: 'Sharing preference is required (1, 2, 3, or 4)' })
    }
    if (!occupation || !['Student', 'Working Professional', 'Other'].includes(occupation)) {
      return res.status(400).json({ error: 'Occupation is required' })
    }
    if (!city_of_origin || typeof city_of_origin !== 'string' || city_of_origin.trim().length < 2) {
      return res.status(400).json({ error: 'City of origin is required' })
    }
    if (duration_value === undefined || duration_value === null || duration_value < 1) {
      return res.status(400).json({ error: 'Duration must be at least 1' })
    }
    if (!duration_unit || !['days', 'months'].includes(duration_unit)) {
      return res.status(400).json({ error: 'Duration unit is required (days or months)' })
    }

    // Initialize request-scoped client to propagate user JWT for RLS
    const authHeader = req.headers.authorization
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY!

    let dbClient = supabase
    if (token && !token.startsWith('mock-token-') && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbClient = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      })
    }

    // Verify PG exists and is approved
    const { data: pg, error: pgError } = await dbClient
      .from('pg_listings')
      .select('id, owner_id, name')
      .eq('id', pg_id)
      .eq('status', 'approved')
      .single()

    if (pgError || !pg) {
      console.error('[Inquiry Route] PG listing lookup error:', pgError || 'PG not found or not approved')
      return res.status(404).json({ error: 'PG not found or not approved' })
    }

    // Verify seeker_id profile exists to prevent foreign key violation (guest fallback)
    let finalSeekerId = seeker_id
    const { data: seekerProfile, error: seekerProfileError } = await dbClient
      .from('profiles')
      .select('id')
      .eq('id', seeker_id)
      .maybeSingle()

    if (seekerProfileError) {
      console.error('[Inquiry Route] Seeker profile lookup warning:', seekerProfileError)
    }

    if (!seekerProfile) {
      // Fallback to the PG's owner_id (which is guaranteed to exist in profiles)
      finalSeekerId = pg.owner_id
    }

    // Insert inquiry
    const { data, error } = await dbClient
      .from('inquiries')
      .insert({
        pg_id,
        seeker_id: finalSeekerId,
        full_name: full_name.trim(),
        mobile: mobile.trim(),
        age: Number(age),
        move_in_date,
        sharing_preference: Number(sharing_preference),
        occupation,
        city_of_origin: city_of_origin.trim(),
        duration_value: Number(duration_value),
        duration_unit,
        message: message?.trim() || null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('[Inquiry Route] Database insert failure details:', error)
      throw error
    }

    // Send push notification to PG owner
    const owner = pg as { owner_id: string; name: string }
    const ownerFcmToken = await getUserFcmToken(owner.owner_id)

    if (ownerFcmToken) {
      const notificationTitle = 'New Inquiry!'
      const notificationBody = `${full_name.trim()} from ${city_of_origin.trim()} is interested in ${owner.name}`

      await sendPushNotification({
        token: ownerFcmToken,
        title: notificationTitle,
        body: notificationBody,
        data: {
          inquiry_id: data.id,
          pg_id: pg_id,
          type: 'inquiry_new',
        },
      })
    }

    // Create in-app notification
    await createNotification({
      userId: owner.owner_id,
      type: 'inquiry_new',
      title: 'New Inquiry!',
      body: `${full_name.trim()} from ${city_of_origin.trim()} is interested in ${owner.name}`,
      data: {
        inquiry_id: data.id,
        pg_id: pg_id,
      },
    })

    res.status(201).json({
      id: data.id,
      message: 'Inquiry submitted successfully. Owner will contact you to confirm availability.',
      inquiry: data,
    })
  } catch (err) {
    console.error('[Inquiry Route] Unhandled error during submission:', err)
    res.status(500).json({ error: (err as Error).message })
  }
})

// PUT /api/inquiry/:id - Update inquiry status
router.put('/:id', async (req, res) => {
  try {
    const { status, owner_notes } = req.body

    // First get the inquiry with related data
    const { data: existingInquiry, error: fetchError } = await supabase
      .from('inquiries')
      .select('*, pg:pg_listings(name, owner_id), seeker:profiles!inquiries_seeker_id_fkey(id, full_name)')
      .eq('id', req.params.id)
      .single()

    if (fetchError || !existingInquiry) {
      return res.status(404).json({ error: 'Inquiry not found' })
    }

    // Update the inquiry
    const { data, error } = await supabase
      .from('inquiries')
      .update({
        status,
        owner_notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw error

    // Send notification to seeker if status changed to confirmed/declined
    const seeker = existingInquiry.seeker as { id: string; full_name: string } | null
    const pg = existingInquiry.pg as { name: string; owner_id: string } | null

    if (seeker && pg) {
      if (status === 'confirmed') {
        // Automatically find an available bed and initialize a pending booking
        const sharingTypeMap: Record<number, string> = { 1: 'single', 2: 'double', 3: 'triple', 4: 'dormitory' }
        const prefStr = existingInquiry.sharing_preference ? sharingTypeMap[existingInquiry.sharing_preference] : 'single'

        const { data: beds } = await supabase
          .from('beds')
          .select('id, monthly_rent')
          .eq('pg_id', existingInquiry.pg_id)
          .eq('status', 'available')
          .eq('sharing_type', prefStr)
          .limit(1)

        const bedId = (beds as any)?.[0]?.id || null

        // Get PG commission rate and deposit
        const { data: pgDetails } = await supabase
          .from('pg_listings')
          .select('commission_rate, deposit_amount, monthly_rent_min')
          .eq('id', existingInquiry.pg_id)
          .single()

        const monthlyRent = (beds as any)?.[0]?.monthly_rent || pgDetails?.monthly_rent_min || 5000

        // Fetch settings for seeker platform fee and service charge
        const settings = await getPlatformSettings()
        const platformFee = parseInt(settings['platform_fee'] || '200', 10)
        const serviceCharge = parseInt(settings['service_charge'] || '100', 10)

        // Calculate dynamic commission rate based on monthly rent
        const commissionRate = calculateCommissionRate(monthlyRent, settings)
        const depositAmount = pgDetails?.deposit_amount || 0
        const commissionAmount = Math.round(depositAmount * (commissionRate / 100))
        const ownerPayout = depositAmount - commissionAmount

        // Total initial amount is Security Deposit + Platform Fee + Service Charge
        const totalInitialAmount = depositAmount + platformFee + serviceCharge

        // Create booking in pending_payment status
        const { data: booking, error: bookingErr } = await supabase
          .from('bookings')
          .insert({
            inquiry_id: existingInquiry.id,
            pg_id: existingInquiry.pg_id,
            seeker_id: existingInquiry.seeker_id,
            owner_id: pg?.owner_id,
            bed_id: bedId,
            monthly_rent: monthlyRent,
            deposit_amount: depositAmount,
            amount: totalInitialAmount,
            commission_pct: commissionRate,
            commission_amount: commissionAmount,
            owner_payout: ownerPayout,
            platform_fee: platformFee,
            service_charge: serviceCharge,
            include_rent: false,
            status: 'pending_payment',
            move_in_date: existingInquiry.move_in_date || new Date().toISOString().split('T')[0]
          })
          .select()
          .single()

        if (bookingErr) {
          console.error('[Inquiry Confirm] Booking creation failed:', bookingErr)
        }

        // Change inquiry status to 'booked' to mark booking has been initialized
        await supabase
          .from('inquiries')
          .update({ status: 'booked', updated_at: new Date().toISOString() })
          .eq('id', existingInquiry.id)

        const seekerFcmToken = await getUserFcmToken(seeker.id)
        const notificationBody = 'Please pay the advance amount or full amount to confirm your bed.'

        if (seekerFcmToken) {
          await sendPushNotification({
            token: seekerFcmToken,
            title: 'Inquiry Confirmed!',
            body: notificationBody,
            data: {
              inquiry_id: req.params.id,
              pg_id: existingInquiry.pg_id,
              booking_id: booking?.id || '',
              type: 'inquiry_confirmed',
            },
          })
        }

        await createNotification({
          userId: seeker.id,
          type: 'inquiry_confirmed',
          title: 'Inquiry Confirmed!',
          body: notificationBody,
          data: {
            inquiry_id: req.params.id,
            pg_id: existingInquiry.pg_id,
            booking_id: booking?.id || '',
          },
        })
      } else if (status === 'cancelled') {
        const seekerFcmToken = await getUserFcmToken(seeker.id)

        if (seekerFcmToken) {
          await sendPushNotification({
            token: seekerFcmToken,
            title: 'Inquiry Declined',
            body: `Owner could not accommodate your inquiry for ${pg.name}.`,
            data: {
              inquiry_id: req.params.id,
              pg_id: existingInquiry.pg_id,
              type: 'inquiry_declined',
            },
          })
        }

        await createNotification({
          userId: seeker.id,
          type: 'inquiry_declined',
          title: 'Inquiry Declined',
          body: `Owner could not accommodate your inquiry for ${pg.name}.`,
          data: {
            inquiry_id: req.params.id,
            pg_id: existingInquiry.pg_id,
          },
        })
      }
    }

    res.json(data)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// DELETE /api/inquiry/:id - Cancel inquiry
router.delete('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('inquiries')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

export default router
