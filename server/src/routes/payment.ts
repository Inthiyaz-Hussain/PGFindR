import { Router } from 'express'
import Razorpay from 'razorpay'
import crypto from 'crypto'
import { supabase } from '../index.js'

const router = Router()

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummykeyid',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummysecret',
})

// POST /api/payment/initiate — Create Razorpay order for a booking
// Input: { booking_id }
// Returns: { razorpay_order_id, amount, currency, key_id }
router.post('/initiate', async (req, res) => {
  try {
    const { booking_id } = req.body

    if (!booking_id || typeof booking_id !== 'string') {
      return res.status(400).json({ error: 'booking_id is required' })
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, pg:pg_listings(name, owner_id)')
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    if (booking.status === 'active' || booking.status === 'completed') {
      return res.status(400).json({ error: 'Booking already paid' })
    }

    const amountInPaise = Math.round(booking.amount * 100)
    let orderId = `demo_order_${Date.now()}`

    try {
      // Create Razorpay order if keys exist
      if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        const order = await razorpay.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: `booking_${booking_id.slice(0, 30)}`,
          notes: {
            booking_id,
            pg_name: booking.pg?.name || 'PGFindR Booking',
          },
        })
        orderId = order.id
      }
    } catch (rzpErr) {
      console.warn('Razorpay order creation failed, falling back to demo order ID:', rzpErr)
    }

    // Store order ID in payments table
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        booking_id,
        seeker_id: booking.seeker_id,
        amount: booking.amount,
        commission_rate: booking.commission_pct,
        commission_amount: booking.commission_amount,
        owner_payout: booking.owner_payout,
        razorpay_order_id: orderId,
        status: 'pending',
        payment_type: 'deposit',
      })
      .select()
      .single()

    if (paymentError) throw paymentError

    res.json({
      razorpay_order_id: orderId,
      amount: amountInPaise,
      currency: 'INR',
      key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_demo',
      payment_id: payment.id,
      is_demo_mode: !process.env.RAZORPAY_KEY_ID || orderId.startsWith('demo_order_'),
    })
  } catch (err) {
    console.error('Payment initiate error:', err)
    res.status(500).json({ error: (err as Error).message })
  }
})

// POST /api/payment/demo-confirm — Instant payment completion for demo/test mode (Holding Razorpay)
// Input: { booking_id }
router.post('/demo-confirm', async (req, res) => {
  try {
    const { booking_id } = req.body

    if (!booking_id) {
      return res.status(400).json({ error: 'booking_id is required' })
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, pg:pg_listings(name, owner_id)')
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    if (booking.status === 'active' || booking.status === 'completed' || booking.status === 'payment_done') {
      return res.status(400).json({ error: 'Booking is already paid' })
    }

    const demoOrderId = `demo_ord_${Date.now()}`
    const demoPaymentId = `demo_pay_${Date.now()}`

    // Insert or update payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        booking_id,
        seeker_id: booking.seeker_id,
        amount: booking.amount,
        commission_rate: booking.commission_pct,
        commission_amount: booking.commission_amount,
        owner_payout: booking.owner_payout,
        razorpay_order_id: demoOrderId,
        razorpay_payment_id: demoPaymentId,
        status: 'completed',
        payment_type: 'deposit',
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

    // Mark bed as reserved
    if (booking.bed_id) {
      await supabase
        .from('beds')
        .update({ status: 'reserved', updated_at: new Date().toISOString() })
        .eq('id', booking.bed_id)
    }

    // Send confirmation notifications
    await supabase.from('notifications').insert([
      {
        user_id: booking.seeker_id,
        type: 'payment_success',
        title: 'Demo Payment Successful',
        body: `Your payment of ₹${payment.amount} has been received (Demo Mode). The owner will confirm your move-in shortly.`,
        data: { booking_id, payment_id: payment.id },
      },
      {
        user_id: booking.owner_id,
        type: 'new_booking',
        title: 'New Booking Payment (Demo)',
        body: `A payment of ₹${payment.amount} has been received for a booking. Confirm move-in to receive your payout.`,
        data: { booking_id, payment_id: payment.id },
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

// POST /api/payment/verify — Validate Razorpay signature, confirm payment
// Input: { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_id }
router.post('/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_id } = req.body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !booking_id) {
      return res.status(400).json({ error: 'Missing required payment fields' })
    }

    // Verify signature: HMAC SHA256 of (order_id|payment_id) using key_secret
    const body = razorpay_order_id + '|' + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(body)
      .digest('hex')

    if (expectedSignature !== razorpay_signature) {
      // Mark payment as failed
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('razorpay_order_id', razorpay_order_id)

      return res.status(400).json({ error: 'Invalid payment signature' })
    }

    // Update payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .update({
        status: 'completed',
        razorpay_payment_id,
      })
      .eq('razorpay_order_id', razorpay_order_id)
      .select()
      .single()

    if (paymentError) throw paymentError

    // Update booking status to 'payment_done' and link payment
    const { data: booking } = await supabase
      .from('bookings')
      .update({
        status: 'payment_done',
        payment_id: payment.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking_id)
      .select('bed_id, seeker_id, owner_id, pg_id')
      .single()

    // Mark bed as reserved (will be 'occupied' on move-in confirmation)
    if (booking?.bed_id) {
      await supabase
        .from('beds')
        .update({ status: 'reserved', updated_at: new Date().toISOString() })
        .eq('id', booking.bed_id)
    }

    // Send confirmation notifications (stored in DB for polling; real push via FCM/Web Push would go here)
    await supabase.from('notifications').insert([
      {
        user_id: booking?.seeker_id,
        type: 'payment_success',
        title: 'Payment Successful',
        body: `Your payment of ₹${payment.amount} has been received. The owner will confirm your move-in shortly.`,
        data: { booking_id, payment_id: payment.id },
      },
      {
        user_id: booking?.owner_id,
        type: 'new_booking',
        title: 'New Booking Payment',
        body: `A payment of ₹${payment.amount} has been received for a booking. Confirm move-in to receive your payout.`,
        data: { booking_id, payment_id: payment.id },
      },
    ])

    res.json({
      success: true,
      payment_id: payment.id,
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
    const disburseAmount = booking.owner_payout // already calculated at booking creation
    const disburseAmountPaise = Math.round(disburseAmount * 100)

    // Initiate Razorpay payout to owner's bank account
    const payout = await (razorpay as any).payouts.create({
      account_number: process.env.RAZORPAY_ACCOUNT_NUMBER || '',
      fund_account_id: process.env.RAZORPAY_FUND_ACCOUNT_ID || '',
      amount: disburseAmountPaise,
      currency: 'INR',
      mode: 'IMPS',
      purpose: 'payout',
      notes: {
        booking_id,
        owner_name: booking.owner?.full_name || '',
        pg_name: booking.pg?.name || '',
      },
    })

    // Update booking status to 'completed' and record payout
    await supabase
      .from('bookings')
      .update({
        status: 'completed',
        disbursed_at: new Date().toISOString(),
        razorpay_payout_id: payout.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking_id)

    // Update payment record with payout info
    await supabase
      .from('payments')
      .update({
        razorpay_payout_id: payout.id,
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
        data: { booking_id, payout_id: payout.id },
      },
    ])

    res.json({
      success: true,
      payout_id: payout.id,
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
