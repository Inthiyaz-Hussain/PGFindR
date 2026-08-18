import { Router } from 'express'
import { supabase } from '../index.js'
import { sendPushNotification } from '../lib/firebase.js'
import { createNotification, getUserFcmToken } from '../lib/notifications.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'
import crypto from 'crypto'

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
      .select('*, pg:pg_listings(name, city), bed:beds!bookings_bed_id_fkey(room_number, bed_label), seeker:profiles!bookings_seeker_id_fkey(full_name)')
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
      .select('*, pg:pg_listings(*), bed:beds!bookings_bed_id_fkey(*), seeker:profiles!bookings_seeker_id_fkey(full_name, phone)')
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
    let { inquiry_id, pg_id, seeker_id, owner_id, bed_id, monthly_rent, move_in_date, num_beds } = req.body
    
    let finalBedId = bed_id
    if (finalBedId === 'auto' || !finalBedId) {
      // Find sharing preference from inquiry
      const { data: inq } = await supabase
        .from('inquiries')
        .select('sharing_preference')
        .eq('id', inquiry_id)
        .maybeSingle()

      const sharingTypeMap: Record<number, string> = { 1: 'single', 2: 'double', 3: 'triple', 4: 'dormitory' }
      const prefStr = inq?.sharing_preference ? sharingTypeMap[inq.sharing_preference] : 'single'

      // Find available bed
      const { data: beds } = await supabase
        .from('beds')
        .select('id')
        .eq('pg_id', pg_id)
        .eq('status', 'available')
        .eq('sharing_type', prefStr)
        .limit(1)

      finalBedId = (beds as any)?.[0]?.id || null

      if (!finalBedId) {
        // Auto-create room & bed to self-heal
        try {
          const { data: pgDetails } = await supabase
            .from('pg_listings')
            .select('monthly_rent_min')
            .eq('id', pg_id)
            .single()

          // Find or create sharing type
          let { data: stList } = await supabase
            .from('sharing_types')
            .select('id')
            .eq('pg_id', pg_id)
            .eq('type', inq?.sharing_preference || 2)
          
          let sharingTypeId = stList?.[0]?.id || null
          if (!sharingTypeId) {
            const { data: newSt } = await supabase
              .from('sharing_types')
              .insert({
                pg_id: pg_id,
                type: inq?.sharing_preference || 2,
                price_monthly: pgDetails?.monthly_rent_min || 8000,
                total_beds: 2,
                occupied_beds: 0
              })
              .select('id')
              .maybeSingle()
            if (newSt) sharingTypeId = newSt.id
          }

          // Find or create room
          let { data: rmList } = await supabase
            .from('rooms')
            .select('id')
            .eq('pg_id', pg_id)
          
          let roomId = rmList?.[0]?.id || null
          if (!roomId && sharingTypeId) {
            const { data: newRm } = await supabase
              .from('rooms')
              .insert({
                pg_id: pg_id,
                sharing_type_id: sharingTypeId,
                room_label: 'Room 101',
                floor: 1,
                door_facing: 'NE',
                has_window: true
              })
              .select('id')
              .maybeSingle()
            if (newRm) roomId = newRm.id
          }

          // Create bed
          if (roomId) {
            const { data: newBed } = await supabase
              .from('beds')
              .insert({
                pg_id: pg_id,
                room_id: roomId,
                room_number: 'Room 101',
                bed_label: 'Bed A',
                sharing_type: prefStr,
                monthly_rent: pgDetails?.monthly_rent_min || 8000,
                status: 'available',
                floor_number: 1,
                has_ac: false,
                has_attached_bath: false,
                bed_type: 'Double'
              })
              .select('id')
              .maybeSingle()
            
            if (newBed) {
              finalBedId = newBed.id
            }
          }
        } catch (e) {
          console.error('Self-healing booking bed creation failed:', e)
        }
      }
    }

    if (!finalBedId) {
      return res.status(400).json({ error: 'No available beds of this sharing preference are left in this PG. Please contact the owner.' })
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
        bed_id: finalBedId,
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

// ─── OWNER PORTAL & TENANT MANAGEMENT ENDPOINTS ──────────────────────────────

// 1. POST /api/booking/walk-in — Log an offline walk-in booking
router.post('/walk-in', authenticateToken, requireRole('owner', 'admin'), async (req: any, res) => {
  try {
    const { pg_id, bed_id, tenant_name, tenant_email, tenant_phone, monthly_rent, move_in_date } = req.body

    if (!pg_id || !bed_id || !tenant_name || !tenant_email || !monthly_rent || !move_in_date) {
      return res.status(400).json({ error: 'pg_id, bed_id, tenant_name, tenant_email, monthly_rent, and move_in_date are required' })
    }

    // A. Check if the bed is available
    const { data: bed, error: bedErr } = await supabase
      .from('beds')
      .select('status')
      .eq('id', bed_id)
      .single()

    if (bedErr || !bed) {
      return res.status(404).json({ error: 'Bed not found' })
    }

    if (bed.status !== 'available') {
      return res.status(400).json({ error: 'Bed is not available for walk-in' })
    }

    // B. Check if profile exists by email, if not create a placeholder seeker profile
    let seekerId: string
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', tenant_email)
      .maybeSingle()

    if (existingProfile) {
      seekerId = existingProfile.id
    } else {
      // Create a dummy UUID since we don't have Supabase Auth user record yet (auth handles it later)
      seekerId = crypto.randomUUID()
      const { error: profileErr } = await supabase
        .from('profiles')
        .insert({
          id: seekerId,
          full_name: tenant_name,
          email: tenant_email,
          phone: tenant_phone || null,
          role: 'seeker'
        })
      if (profileErr) throw profileErr
    }

    // C. Create direct active booking
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .insert({
        pg_id,
        seeker_id: seekerId,
        owner_id: req.user.id,
        bed_id,
        num_beds: 1,
        monthly_rent,
        deposit_amount: monthly_rent, // Default to 1 month rent as deposit for offline
        amount: monthly_rent * 2, // Total rent + deposit
        status: 'active',
        move_in_date,
        confirmed_at: new Date().toISOString()
      })
      .select()
      .single()

    if (bookingErr) throw bookingErr

    // D. Mark bed as occupied
    await supabase
      .from('beds')
      .update({
        status: 'occupied',
        occupied_by_booking_id: booking.id,
        occupied_since: move_in_date,
        updated_at: new Date().toISOString()
      })
      .eq('id', bed_id)

    // E. Generate initial invoice for walk-in rent + deposit
    const invoiceNumber = `INV-WK-${Date.now()}`
    await supabase
      .from('invoices')
      .insert({
        booking_id: booking.id,
        seeker_id: seekerId,
        owner_id: req.user.id,
        invoice_number: invoiceNumber,
        amount: monthly_rent * 2,
        status: 'unpaid',
        due_date: new Date().toISOString().split('T')[0]
      })

    res.status(201).json({
      message: 'Offline walk-in registered successfully',
      booking
    })
  } catch (err: any) {
    console.error('Walk-in error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// 2. GET /api/booking/:bookingId/invoices — Fetch all invoices for a booking
router.get('/:bookingId/invoices', authenticateToken, async (req: any, res) => {
  try {
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('booking_id', req.params.bookingId)
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json(invoices)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// 3. POST /api/booking/:bookingId/invoices — Generate manual invoice (monthly rent dues)
router.post('/:bookingId/invoices', authenticateToken, requireRole('owner', 'admin'), async (req: any, res) => {
  try {
    const { amount, due_date, billing_period_start, billing_period_end } = req.body

    if (!amount || !due_date) {
      return res.status(400).json({ error: 'amount and due_date are required' })
    }

    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('seeker_id, owner_id')
      .eq('id', req.params.bookingId)
      .single()

    if (bookingErr || !booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    const invoiceNumber = `INV-${Date.now()}`
    const { data: invoice, error: invoiceErr } = await supabase
      .from('invoices')
      .insert({
        booking_id: req.params.bookingId,
        seeker_id: booking.seeker_id,
        owner_id: booking.owner_id,
        invoice_number: invoiceNumber,
        amount,
        status: 'unpaid',
        due_date,
        billing_period_start,
        billing_period_end
      })
      .select()
      .single()

    if (invoiceErr) throw invoiceErr
    res.status(201).json(invoice)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// 4. PUT /api/booking/invoices/:invoiceId/pay — Mark invoice paid
router.put('/invoices/:invoiceId/pay', authenticateToken, requireRole('owner', 'admin'), async (req: any, res) => {
  try {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.invoiceId)
      .select()
      .single()

    if (error) throw error
    res.json({ message: 'Invoice marked as paid successfully', invoice })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// 5. POST /api/booking/:bookingId/tenant-documents — Upload/store tenant document
router.post('/:bookingId/tenant-documents', authenticateToken, async (req: any, res) => {
  try {
    const { doc_type, url } = req.body

    if (!doc_type || !url) {
      return res.status(400).json({ error: 'doc_type and url are required' })
    }

    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('seeker_id')
      .eq('id', req.params.bookingId)
      .single()

    if (bookingErr || !booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    const { data: document, error: docErr } = await supabase
      .from('tenant_documents')
      .insert({
        booking_id: req.params.bookingId,
        seeker_id: booking.seeker_id,
        doc_type,
        url
      })
      .select()
      .single()

    if (docErr) throw docErr
    res.status(201).json(document)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// 6. GET /api/booking/:bookingId/tenant-documents — Retrieve tenant documents
router.get('/:bookingId/tenant-documents', authenticateToken, async (req: any, res) => {
  try {
    const { data: documents, error } = await supabase
      .from('tenant_documents')
      .select('*')
      .eq('booking_id', req.params.bookingId)
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json(documents)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
