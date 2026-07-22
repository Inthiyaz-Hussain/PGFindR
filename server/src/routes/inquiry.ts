import { Router } from 'express'
import { supabase } from '../index.js'
import { sendPushNotification } from '../lib/firebase.js'
import { createNotification, getUserFcmToken } from '../lib/notifications.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

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

    // Verify PG exists and is approved
    const { data: pg, error: pgError } = await supabase
      .from('pg_listings')
      .select('id, owner_id, name')
      .eq('id', pg_id)
      .eq('status', 'approved')
      .single()

    if (pgError || !pg) {
      return res.status(404).json({ error: 'PG not found or not approved' })
    }

    // Verify seeker_id profile exists to prevent foreign key violation (guest fallback)
    let finalSeekerId = seeker_id
    const { data: seekerProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', seeker_id)
      .maybeSingle()

    if (!seekerProfile) {
      // Fallback to the PG's owner_id (which is guaranteed to exist in profiles)
      finalSeekerId = pg.owner_id
    }

    // Insert inquiry
    const { data, error } = await supabase
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

    if (error) throw error

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
        const seekerFcmToken = await getUserFcmToken(seeker.id)

        if (seekerFcmToken) {
          await sendPushNotification({
            token: seekerFcmToken,
            title: 'Inquiry Confirmed!',
            body: `Owner confirmed availability at ${pg.name}. Proceed to payment.`,
            data: {
              inquiry_id: req.params.id,
              pg_id: existingInquiry.pg_id,
              type: 'inquiry_confirmed',
            },
          })
        }

        await createNotification({
          userId: seeker.id,
          type: 'inquiry_confirmed',
          title: 'Inquiry Confirmed!',
          body: `Owner confirmed availability at ${pg.name}. Proceed to payment.`,
          data: {
            inquiry_id: req.params.id,
            pg_id: existingInquiry.pg_id,
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
