import { Router } from 'express'
import { supabase } from '../index.js'
import { z } from 'zod'
import { validateRequest } from '../middleware/validation.js'
import { paymentRateLimiter } from '../middleware/rateLimiter.js'

const router = Router()

const initiatePaymentSchema = z.object({
  body: z.object({
    booking_id: z.string().uuid('Invalid booking ID format'),
    include_rent: z.boolean().optional(),
  })
})

const verifyPaymentSchema = z.object({
  body: z.object({
    booking_id: z.string().uuid('Invalid booking ID format'),
  })
})

const getCashfreeConfig = () => {
  const env = process.env.CASHFREE_ENV === 'PRODUCTION' ? 'production' : 'sandbox'
  const baseUrl = env === 'production' 
    ? 'https://api.cashfree.com/pg/orders' 
    : 'https://sandbox.cashfree.com/pg/orders'
  
  return {
    env,
    baseUrl,
    appId: process.env.CASHFREE_CLIENT_ID || '',
    secretKey: process.env.CASHFREE_SECRET_KEY || ''
  }
}

async function getPlatformSettings(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('platform_settings').select('key, value')
  if (error) {
    console.error('Error fetching platform settings:', error)
    return {}
  }
  return (data || []).reduce((acc: Record<string, string>, curr) => {
    acc[curr.key] = curr.value
    return acc
  }, {})
}

function calculateCommissionRate(settings: Record<string, string>): number {
  return parseFloat(settings['commission_rate'] || '1.00')
}

// POST /api/payment/initiate — Create Cashfree order for a booking
// Input: { booking_id, include_rent }
// Returns: { cashfree_order_id, payment_session_id, amount, currency }
router.post('/initiate', paymentRateLimiter, validateRequest(initiatePaymentSchema), async (req, res) => {
  try {
    const { booking_id, include_rent } = req.body

    if (!booking_id || typeof booking_id !== 'string') {
      return res.status(400).json({ error: 'booking_id is required' })
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, pg:pg_listings(name, owner_id), seeker:profiles!bookings_seeker_id_fkey(full_name, phone)')
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    if (booking.status === 'active' || booking.status === 'completed' || booking.status === 'payment_done') {
      return res.status(400).json({ error: 'Booking already paid' })
    }

    const settings = await getPlatformSettings()
    const numBeds = booking.num_beds || 1
    const platformFee = parseInt(settings['platform_fee'] || '300', 10) * numBeds
    const serviceCharge = parseInt(settings['service_charge'] || '0', 10) * numBeds
    const depositAmount = booking.deposit_amount || 0
    const monthlyRent = booking.monthly_rent || 0
    const commissionRate = calculateCommissionRate(settings)

    const paidRent = include_rent === true
    const totalAmount = depositAmount + (paidRent ? monthlyRent : 0) + platformFee + serviceCharge
    const commissionAmount = Math.round(depositAmount * (commissionRate / 100))
    const ownerPayout = (depositAmount - commissionAmount) + (paidRent ? monthlyRent : 0)

    // Update booking record first with the selection details
    const { error: bookingUpdateErr } = await supabase
      .from('bookings')
      .update({
        amount: totalAmount,
        include_rent: paidRent,
        owner_payout: ownerPayout,
        commission_amount: commissionAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking_id)

    if (bookingUpdateErr) throw bookingUpdateErr

    let orderId = `cf_order_${Date.now()}`
    let paymentSessionId = `demo_session_${Date.now()}`
    const isDemoMode = !process.env.CASHFREE_CLIENT_ID || !process.env.CASHFREE_SECRET_KEY

    if (!isDemoMode) {
      try {
        const { baseUrl } = getCashfreeConfig()
        const cfResponse = await fetch(baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-version': '2023-08-01',
            'x-client-id': process.env.CASHFREE_CLIENT_ID!,
            'x-client-secret': process.env.CASHFREE_SECRET_KEY!,
          },
          body: JSON.stringify({
            order_id: orderId,
            order_amount: totalAmount,
            order_currency: 'INR',
            customer_details: {
              customer_id: booking.seeker_id,
              customer_name: booking.seeker?.full_name || 'Seeker',
              customer_phone: booking.seeker?.phone || '9999999999',
              customer_email: 'seeker@example.com',
            },
            order_meta: {
              return_url: `${req.headers.origin || 'http://localhost:5173'}/payment/${booking_id}?cashfree_callback=true`
            }
          })
        })

        if (!cfResponse.ok) {
          const errData = await cfResponse.json().catch(() => ({})) as any
          throw new Error(errData.message || 'Cashfree order creation failed')
        }

        const cfOrder = await cfResponse.json() as any
        orderId = cfOrder.order_id
        paymentSessionId = cfOrder.payment_session_id
      } catch (cfErr) {
        console.warn('Cashfree order creation failed, falling back to demo order ID:', cfErr)
      }
    } else {
      orderId = `cf_order_demo_${Date.now()}`
    }

    // Store order ID in payments table
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        booking_id,
        seeker_id: booking.seeker_id,
        amount: totalAmount,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        owner_payout: ownerPayout,
        cashfree_order_id: orderId,
        status: 'pending',
        payment_type: paidRent ? 'monthly_rent' : 'deposit',
        platform_fee: platformFee,
        service_charge: serviceCharge,
        include_rent: paidRent,
      })
      .select()
      .single()

    if (paymentError) throw paymentError

    res.json({
      cashfree_order_id: orderId,
      payment_session_id: paymentSessionId,
      amount: totalAmount,
      currency: 'INR',
      payment_id: payment.id,
      is_demo_mode: isDemoMode || orderId.startsWith('cf_order_demo_'),
    })
  } catch (err) {
    console.error('Payment initiate error:', err)
    res.status(500).json({ error: (err as Error).message })
  }
})

// POST /api/payment/demo-confirm — Instant payment completion for demo/test mode
// Input: { booking_id, include_rent }
router.post('/demo-confirm', paymentRateLimiter, validateRequest(initiatePaymentSchema), async (req, res) => {
  try {
    const { booking_id, include_rent } = req.body

    if (!booking_id) {
      return res.status(400).json({ error: 'booking_id is required' })
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, pg:pg_listings(name, owner_id), seeker:profiles!bookings_seeker_id_fkey(full_name)')
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    if (booking.status === 'active' || booking.status === 'completed' || booking.status === 'payment_done') {
      return res.status(400).json({ error: 'Booking is already paid' })
    }

    const settings = await getPlatformSettings()
    const numBeds = booking.num_beds || 1
    const platformFee = parseInt(settings['platform_fee'] || '300', 10) * numBeds
    const serviceCharge = parseInt(settings['service_charge'] || '0', 10) * numBeds
    const depositAmount = booking.deposit_amount || 0
    const monthlyRent = booking.monthly_rent || 0
    const commissionRate = calculateCommissionRate(settings)

    const paidRent = include_rent === true
    const totalAmount = depositAmount + (paidRent ? monthlyRent : 0) + platformFee + serviceCharge
    const commissionAmount = Math.round(depositAmount * (commissionRate / 100))
    const ownerPayout = (depositAmount - commissionAmount) + (paidRent ? monthlyRent : 0)

    // Update booking record first with the selection details
    const { error: bookingUpdateErr } = await supabase
      .from('bookings')
      .update({
        amount: totalAmount,
        include_rent: paidRent,
        owner_payout: ownerPayout,
        commission_amount: commissionAmount,
      })
      .eq('id', booking_id)

    if (bookingUpdateErr) throw bookingUpdateErr

    const demoOrderId = `cf_ord_demo_${Date.now()}`
    const demoPaymentId = `cf_pay_demo_${Date.now()}`

    // Insert or update payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        booking_id,
        seeker_id: booking.seeker_id,
        amount: totalAmount,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        owner_payout: ownerPayout,
        cashfree_order_id: demoOrderId,
        cashfree_payment_id: demoPaymentId,
        status: 'completed',
        payment_type: paidRent ? 'monthly_rent' : 'deposit',
        platform_fee: platformFee,
        service_charge: serviceCharge,
        include_rent: paidRent,
      })
      .select()
      .single()

    if (paymentError) throw paymentError

    // Update booking status to 'payment_done' and link payment
    await supabase
      .from('bookings')
      .update({
        status: 'payment_done',
        payment_id: payment.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking_id)

    // Mark beds as reserved safely using RPC database transaction
    if (booking.bed_id) {
      const { data: reservedOk, error: reserveErr } = await supabase.rpc('reserve_bed_safely', {
        p_bed_id: booking.bed_id,
        p_pg_id: booking.pg_id,
        p_num_beds: booking.num_beds || 1
      })

      if (reserveErr || !reservedOk) {
        console.error('Safe bed reservation failed (demo):', reserveErr?.message || 'Bed no longer available')
        await supabase.from('payments').update({ status: 'failed' }).eq('id', payment.id)
        await supabase.from('bookings').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', booking_id)
        return res.status(400).json({ error: 'This bed is no longer available. Double-booking prevented.' })
      }
    }

    // Generate Invoice
    const invoiceNumber = `INV-PAY-${Date.now()}`
    await supabase
      .from('invoices')
      .insert({
        booking_id: booking.id,
        seeker_id: booking.seeker_id,
        owner_id: booking.owner_id,
        invoice_number: invoiceNumber,
        amount: payment.amount,
        status: 'paid',
        due_date: new Date().toISOString().split('T')[0],
        billing_period_start: new Date().toISOString().split('T')[0],
        billing_period_end: new Date().toISOString().split('T')[0]
      })

    const seekerName = (booking.seeker as any)?.full_name || 'Seeker'
    const pgName = (booking.pg as any)?.name || 'PG'

    // Send confirmation notifications
    await supabase.from('notifications').insert([
      {
        user_id: booking.seeker_id,
        type: 'payment_success',
        title: 'Payment Successful & Invoice Generated',
        body: `Hello ${seekerName}, your payment of ₹${payment.amount} for ${pgName} is successful. Status: Completed. View Invoice: /invoice/seeker/${payment.id}`,
        data: { booking_id, payment_id: payment.id, invoice_number: invoiceNumber, link: `/invoice/seeker/${payment.id}` },
      },
      {
        user_id: booking.owner_id,
        type: 'new_booking',
        title: 'Payment Received & Invoice Generated',
        body: `Dear Owner, seeker ${seekerName} has successfully paid. View Payout Statement: /invoice/owner/${payment.id}`,
        data: { booking_id, payment_id: payment.id, invoice_number: invoiceNumber, link: `/invoice/owner/${payment.id}` },
      },
    ])

    res.json({
      success: true,
      payment_id: payment.id,
      booking_id,
      status: 'payment_done',
      message: 'Demo payment completed successfully',
    })
  } catch (err) {
    console.error('Demo payment error:', err)
    res.status(500).json({ error: (err as Error).message })
  }
})

// POST /api/payment/verify — Validate Cashfree signature, confirm payment
// Input: { booking_id }
router.post('/verify', paymentRateLimiter, validateRequest(verifyPaymentSchema), async (req, res) => {
  try {
    const { booking_id } = req.body

    if (!booking_id) {
      return res.status(400).json({ error: 'booking_id is required' })
    }

    // Get the most recent pending payment record
    const { data: payment, error: payError } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', booking_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (payError || !payment) {
      return res.status(404).json({ error: 'Pending payment record not found' })
    }

    const orderId = payment.cashfree_order_id
    let isPaid = false
    let cashfreePaymentId = `cf_pay_demo_${Date.now()}`

    // If order is demo mode
    if (orderId && (orderId.startsWith('cf_order_demo_') || orderId.startsWith('cf_ord_demo_'))) {
      isPaid = true
    } else if (process.env.CASHFREE_CLIENT_ID && process.env.CASHFREE_SECRET_KEY) {
      try {
        const { baseUrl } = getCashfreeConfig()
        const cfResponse = await fetch(`${baseUrl}/${orderId}`, {
          method: 'GET',
          headers: {
            'x-api-version': '2023-08-01',
            'x-client-id': process.env.CASHFREE_CLIENT_ID!,
            'x-client-secret': process.env.CASHFREE_SECRET_KEY!,
          }
        })

        if (cfResponse.ok) {
          const cfOrder = await cfResponse.json() as any
          if (cfOrder.order_status === 'PAID') {
            isPaid = true
            cashfreePaymentId = cfOrder.cf_order_id || `cf_pay_${Date.now()}`
          }
        }
      } catch (err) {
        console.error('Cashfree order status check failed:', err)
      }
    }

    if (!isPaid) {
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', payment.id)

      return res.status(400).json({ error: 'Payment not completed or verification failed' })
    }

    // Update payment record
    const { data: updatedPayment, error: paymentError } = await supabase
      .from('payments')
      .update({
        status: 'completed',
        cashfree_payment_id: cashfreePaymentId,
      })
      .eq('id', payment.id)
      .select()
      .single()

    if (paymentError) throw paymentError

    // Update booking status to 'payment_done' and link payment
    const { data: booking } = await supabase
      .from('bookings')
      .update({
        status: 'payment_done',
        payment_id: updatedPayment.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking_id)
      .select('*, pg:pg_listings(name, owner_id), seeker:profiles!bookings_seeker_id_fkey(full_name)')
      .single()

    // Mark beds as reserved safely using RPC database transaction (will be 'occupied' on move-in confirmation)
    if (booking?.bed_id) {
      const { data: reservedOk, error: reserveErr } = await supabase.rpc('reserve_bed_safely', {
        p_bed_id: booking.bed_id,
        p_pg_id: booking.pg_id,
        p_num_beds: booking.num_beds || 1
      })

      if (reserveErr || !reservedOk) {
        console.error('Safe bed reservation failed (verify):', reserveErr?.message || 'Bed no longer available')
        await supabase.from('payments').update({ status: 'failed' }).eq('id', updatedPayment.id)
        await supabase.from('bookings').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', booking_id)
        return res.status(400).json({ error: 'This bed is no longer available. Double-booking prevented.' })
      }
    }

    // Generate Invoice
    const invoiceNumber = `INV-PAY-${Date.now()}`
    await supabase
      .from('invoices')
      .insert({
        booking_id: booking.id,
        seeker_id: booking.seeker_id,
        owner_id: booking.owner_id,
        invoice_number: invoiceNumber,
        amount: updatedPayment.amount,
        status: 'paid',
        due_date: new Date().toISOString().split('T')[0],
        billing_period_start: new Date().toISOString().split('T')[0],
        billing_period_end: new Date().toISOString().split('T')[0]
      })

    const seekerName = (booking as any)?.seeker?.full_name || 'Seeker'
    const pgName = (booking as any)?.pg?.name || 'PG'

    // Send confirmation notifications
    await supabase.from('notifications').insert([
      {
        user_id: booking.seeker_id,
        type: 'payment_success',
        title: 'Payment Successful & Invoice Generated',
        body: `Hello ${seekerName}, your payment of ₹${updatedPayment.amount} for ${pgName} is successful. Status: Completed. View Invoice: /invoice/seeker/${updatedPayment.id}`,
        data: { booking_id, payment_id: updatedPayment.id, invoice_number: invoiceNumber, link: `/invoice/seeker/${updatedPayment.id}` },
      },
      {
        user_id: booking.owner_id,
        type: 'new_booking',
        title: 'Payment Received & Invoice Generated',
        body: `Dear Owner, seeker ${seekerName} has successfully paid. View Payout Statement: /invoice/owner/${updatedPayment.id}`,
        data: { booking_id, payment_id: updatedPayment.id, invoice_number: invoiceNumber, link: `/invoice/owner/${updatedPayment.id}` },
      },
    ])

    res.json({
      success: true,
      payment_id: updatedPayment.id,
      booking_id,
      status: 'payment_done',
    })
  } catch (err) {
    console.error('Payment verify error:', err)
    res.status(500).json({ error: (err as Error).message })
  }
})

// POST /api/payment/disburse — Admin/automated trigger to pay owner (minus commission)
// Input: { booking_id }
router.post('/disburse', async (req, res) => {
  try {
    const { booking_id } = req.body

    if (!booking_id) {
      return res.status(400).json({ error: 'booking_id is required' })
    }

    // Get booking with owner KYC for bank details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, pg:pg_listings(name), owner:profiles!bookings_owner_id_fkey(full_name), kyc:owner_kyc(bank_account, bank_ifsc, bank_name, status)')
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    if (booking.status !== 'payment_done' && booking.status !== 'active') {
      return res.status(400).json({ error: `Cannot disburse for booking with status: ${booking.status}` })
    }

    const kyc = Array.isArray(booking.kyc) ? booking.kyc[0] : booking.kyc
    if (!kyc || kyc.status !== 'approved' || !kyc.bank_account) {
      return res.status(400).json({ error: 'Owner KYC not approved or bank details missing' })
    }

    // Calculate disbursement: amount - (amount * commission_pct / 100)
    const disburseAmount = booking.owner_payout 
    const payoutId = `cf_payout_demo_${Date.now()}`

    // Update booking status to 'completed' and record payout
    await supabase
      .from('bookings')
      .update({
        status: 'completed',
        disbursed_at: new Date().toISOString(),
        cashfree_payout_id: payoutId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking_id)

    // Update payment record with payout info
    await supabase
      .from('payments')
      .update({
        cashfree_payout_id: payoutId,
        disbursed_at: new Date().toISOString(),
      })
      .eq('booking_id', booking_id)
      .eq('status', 'completed')

    // Notify owner
    await supabase.from('notifications').insert([
      {
        user_id: booking.owner_id,
        type: 'payout_initiated',
        title: 'Payout Initiated',
        body: `₹${disburseAmount} has been disbursed to your bank account (after ₹${booking.commission_amount} platform commission).`,
        data: { booking_id, payout_id: payoutId },
      },
    ])

    res.json({
      success: true,
      payout_id: payoutId,
      disburse_amount: disburseAmount,
      commission_amount: booking.commission_amount,
      booking_id,
    })
  } catch (err) {
    console.error('Payment disburse error:', err)
    res.status(500).json({ error: (err as Error).message })
  }
})

// GET /api/payment/:booking_id — Get payment status for a booking
router.get('/:booking_id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', req.params.booking_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    res.json(data || { status: 'none' })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

export default router
