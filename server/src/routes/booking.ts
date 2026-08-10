import { Router } from 'express'
import { supabase } from '../index.js'
import { sendPushNotification } from '../lib/firebase.js'
import { createNotification, getUserFcmToken } from '../lib/notifications.js'

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
      .select('*, pg:pg_listings(*), bed:beds(*), seeker:profiles!bookings_seeker_id_fkey(full_name, phone)')
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
    const { inquiry_id, pg_id, seeker_id, owner_id, bed_id, monthly_rent, move_in_date, num_beds } = req.body
    
    if (!bed_id) {
      return res.status(400).json({ error: 'A valid bed_id is required.' })
    }
    const numBeds = num_beds || 1

    // Get PG commission rate and deposit
    const { data: pg } = await supabase
      .from('pg_listings')
      .select('commission_rate, deposit_amount')
      .eq('id', pg_id)
      .single()

    const settings = await getPlatformSettings()
    const platformFee = parseInt(settings['platform_fee'] || '200', 10) * numBeds
    const serviceCharge = parseInt(settings['service_charge'] || '100', 10) * numBeds

    const baseMonthlyRent = monthly_rent || 5000
    const scaledMonthlyRent = baseMonthlyRent * numBeds

    const commissionRate = calculateCommissionRate(baseMonthlyRent, settings)
    const depositAmount = (pg?.deposit_amount || 0) * numBeds
    const commissionAmount = Math.round(depositAmount * (commissionRate / 100))
    const ownerPayout = depositAmount - commissionAmount
    const totalInitialAmount = depositAmount + platformFee + serviceCharge

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        inquiry_id,
        pg_id,
        seeker_id,
        owner_id,
        bed_id,
        num_beds: numBeds,
        monthly_rent: scaledMonthlyRent,
        deposit_amount: depositAmount,
        amount: totalInitialAmount,
        commission_pct: commissionRate,
        commission_amount: commissionAmount,
        owner_payout: ownerPayout,
        platform_fee: platformFee,
        service_charge: serviceCharge,
        include_rent: false,
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

    // Mark bed as occupied and link the booking details
    await supabase
      .from('beds')
      .update({
        status: 'occupied',
        occupied_by_booking_id: req.params.id,
        occupied_since: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        updated_at: new Date().toISOString()
      })
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
