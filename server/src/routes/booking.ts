import { Router } from 'express'
import { supabase } from '../index.js'
import { sendPushNotification } from '../lib/firebase.js'
import { createNotification, getUserFcmToken } from '../lib/notifications.js'

const router = Router()

// GET /api/booking - List bookings (filtered by user role)
router.get('/', async (req, res) => {
  try {
    const { user_id, owner_id } = req.query

    let query = supabase
      .from('bookings')
      .select('*, pg:pg_listings(name, city), bed:beds(room_number, bed_label), seeker:profiles!bookings_seeker_id_fkey(full_name)')
      .order('created_at', { ascending: false })

    if (owner_id) {
      query = query.eq('owner_id', owner_id as string)
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

// GET /api/booking/:id - Get single booking
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, pg:pg_listings(*), bed:beds(*), seeker:profiles!bookings_seeker_id_fkey(full_name, phone, email)')
      .eq('id', req.params.id)
      .single()

    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Booking not found' })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// POST /api/booking - Create booking from confirmed inquiry
router.post('/', async (req, res) => {
  try {
    const { inquiry_id, pg_id, seeker_id, owner_id, bed_id, monthly_rent, move_in_date } = req.body

    // Get PG commission rate and deposit
    const { data: pg } = await supabase
      .from('pg_listings')
      .select('commission_rate, deposit_amount')
      .eq('id', pg_id)
      .single()

    const commissionRate = pg?.commission_rate || 10
    const depositAmount = pg?.deposit_amount || 0
    const commissionAmount = Math.round(depositAmount * (commissionRate / 100))
    const ownerPayout = depositAmount - commissionAmount

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        inquiry_id,
        pg_id,
        seeker_id,
        owner_id,
        bed_id,
        monthly_rent,
        deposit_amount: depositAmount,
        amount: depositAmount,
        commission_pct: commissionRate,
        commission_amount: commissionAmount,
        owner_payout: ownerPayout,
        status: 'pending_payment',
        move_in_date
      })
      .select()
      .single()

    if (error) throw error

    // Update inquiry status to booked
    await supabase
      .from('inquiries')
      .update({ status: 'booked', updated_at: new Date().toISOString() })
      .eq('id', inquiry_id)

    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// PUT /api/booking/:id/confirm-movein — Owner confirms move-in, marks bed occupied
// This triggers the platform-holds → pay-owner flow
router.put('/:id/confirm-movein', async (req, res) => {
  try {
    const { data: booking, error } = await supabase
      .from('bookings')
      .update({
        status: 'active',
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .in('status', ['payment_done', 'active'])
      .select('bed_id, seeker_id, owner_id, pg_id, amount, commission_amount, owner_payout')
      .single()

    if (error) throw error
    if (!booking) return res.status(404).json({ error: 'Booking not found or not in a confirmable state' })

    // Mark bed as occupied
    await supabase
      .from('beds')
      .update({ status: 'occupied', updated_at: new Date().toISOString() })
      .eq('id', booking.bed_id)

    // Update PG availability count
    const { data: bedData } = await supabase
      .from('beds')
      .select('pg_id')
      .eq('id', booking.bed_id)
      .single()

    if (bedData?.pg_id) {
      const { count: totalBeds } = await supabase
        .from('beds')
        .select('*', { count: 'exact', head: true })
        .eq('pg_id', bedData.pg_id)

      const { count: availableBeds } = await supabase
        .from('beds')
        .select('*', { count: 'exact', head: true })
        .eq('pg_id', bedData.pg_id)
        .eq('status', 'available')

      await supabase
        .from('pg_listings')
        .update({
          total_beds: totalBeds || 0,
          available_beds: availableBeds || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', bedData.pg_id)
    }

    // Notify seeker
    const bookingData = booking as { seeker_id: string; pg_id: string; bed_id: string }
    await createNotification({
      userId: bookingData.seeker_id,
      type: 'booking_confirmed',
      title: 'Move-in Confirmed!',
      body: 'Your move-in has been confirmed by the PG owner. Welcome to your new home!',
      data: { booking_id: req.params.id, pg_id: bookingData.pg_id },
    })

    // Send push notification to seeker
    const seekerFcmToken = await getUserFcmToken(bookingData.seeker_id)
    if (seekerFcmToken) {
      const { data: pgData } = await supabase
        .from('pg_listings')
        .select('name')
        .eq('id', bookingData.pg_id)
        .single()

      await sendPushNotification({
        token: seekerFcmToken,
        title: 'Booking Confirmed!',
        body: `Your bed at ${pgData?.name || 'PG'} is confirmed!`,
        data: {
          booking_id: req.params.id,
          pg_id: bookingData.pg_id,
          type: 'booking_confirmed',
        },
      })
    }

    res.json({
      success: true,
      booking_id: req.params.id,
      status: 'active',
      message: 'Move-in confirmed. Platform will disburse payout to owner shortly.',
    })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// PUT /api/booking/:id/cancel — Cancel booking and release bed
router.put('/:id/cancel', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw error

    // Release bed
    await supabase
      .from('beds')
      .update({ status: 'available', updated_at: new Date().toISOString() })
      .eq('id', data.bed_id)

    res.json(data)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

export default router
