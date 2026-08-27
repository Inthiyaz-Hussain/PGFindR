import { Router } from 'express'
import crypto from 'crypto'
import { supabase } from '../index.js'

const router = Router()

// POST /api/webhook/razorpay — Handle Razorpay async webhook events
// Razorpay sends X-Razorpay-Signature header for verification
router.post('/razorpay', async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || ''
    const signature = req.headers['x-razorpay-signature'] as string

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      const body = JSON.stringify(req.body)
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex')

      if (expectedSignature !== signature) {
        console.error('Webhook signature mismatch')
        return res.status(400).json({ error: 'Invalid webhook signature' })
      }
    }

    const { event, payload } = req.body

    console.log('Webhook event:', event)

    switch (event) {
      case 'payment.captured': {
        const payment = payload.payment.entity
        const bookingId = payment.notes?.booking_id

        if (bookingId) {
          // Update payment status
          await supabase
            .from('payments')
            .update({
              status: 'completed',
              razorpay_payment_id: payment.id,
            })
            .eq('razorpay_order_id', payment.order_id)

          // Update booking to payment_done
          const { data: booking } = await supabase
            .from('bookings')
            .update({
              status: 'payment_done',
              updated_at: new Date().toISOString(),
            })
            .eq('id', bookingId)
            .select('bed_id, seeker_id, owner_id')
            .single()

          // Mark bed as reserved
          if (booking?.bed_id) {
            await supabase
              .from('beds')
              .update({ status: 'reserved', updated_at: new Date().toISOString() })
              .eq('id', booking.bed_id)
          }

          // Send notifications
          await supabase.from('notifications').insert([
            {
              user_id: booking?.seeker_id,
              type: 'payment_success',
              title: 'Payment Captured',
              body: `Your payment of ₹${payment.amount / 100} has been captured.`,
              data: { booking_id: bookingId },
            },
            {
              user_id: booking?.owner_id,
              type: 'new_booking',
              title: 'Payment Received',
              body: `A payment has been received for a booking. Confirm move-in to trigger payout.`,
              data: { booking_id: bookingId },
            },
          ])
        }
        break
      }

      case 'payment.failed': {
        const payment = payload.payment.entity
        await supabase
          .from('payments')
          .update({ status: 'failed' })
          .eq('razorpay_order_id', payment.order_id)

        const bookingId = payment.notes?.booking_id
        if (bookingId) {
          await supabase
            .from('bookings')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('id', bookingId)
        }
        break
      }

      case 'payout.processed': {
        const payout = payload.payout.entity
        const bookingId = payout.notes?.booking_id

        if (bookingId) {
          await supabase
            .from('bookings')
            .update({
              status: 'completed',
              disbursed_at: new Date().toISOString(),
              razorpay_payout_id: payout.id,
              updated_at: new Date().toISOString(),
            })
            .eq('id', bookingId)

          await supabase
            .from('payments')
            .update({
              razorpay_payout_id: payout.id,
              disbursed_at: new Date().toISOString(),
            })
            .eq('booking_id', bookingId)
        }
        break
      }

      case 'payout.failed': {
        const payout = payload.payout.entity
        const bookingId = payout.notes?.booking_id

        if (bookingId) {
          // Revert booking status — payout failed, money still held by platform
          await supabase
            .from('bookings')
            .update({
              status: 'payment_done',
              razorpay_payout_id: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', bookingId)

          // Notify admin
          await supabase.from('notifications').insert([
            {
              user_id: null,
              type: 'payout_failed',
              title: 'Payout Failed',
              body: `Payout ${payout.id} for booking ${bookingId} failed. Manual review required.`,
              data: { booking_id: bookingId, payout_id: payout.id },
            },
          ])
        }
        break
      }

      case 'refund.created': {
        const refund = payload.refund.entity
        await supabase
          .from('payments')
          .update({ status: 'refunded' })
          .eq('razorpay_payment_id', refund.payment_id)
        break
      }

      default:
        console.log('Unhandled webhook event:', event)
    }

    res.json({ received: true })
  } catch (err) {
    console.error('Webhook error:', err)
    res.status(500).json({ error: (err as Error).message })
  }
})

// POST /api/webhook/cashfree — Handle Cashfree async webhook events
router.post('/cashfree', async (req: any, res) => {
  try {
    const signature = req.headers['x-webhook-signature'] as string
    const timestamp = req.headers['x-webhook-timestamp'] as string
    const secretKey = process.env.CASHFREE_SECRET_KEY || ''

    if (!signature || !timestamp) {
      console.error('Missing Cashfree webhook headers')
      return res.status(400).json({ error: 'Missing webhook signature headers' })
    }

    // Verify webhook signature manually if secret is configured
    if (secretKey) {
      const rawBody = req.rawBody || ''
      const expectedSignature = crypto
        .createHmac('sha256', secretKey)
        .update(timestamp + rawBody)
        .digest('base64')

      if (expectedSignature !== signature) {
        console.error('Cashfree webhook signature verification failed')
        return res.status(400).json({ error: 'Invalid webhook signature' })
      }
    }

    const { type, data } = req.body
    console.log('Cashfree webhook event type:', type)

    const orderId = data?.order?.order_id
    const cfPaymentId = data?.payment?.cf_payment_id

    if (!orderId) {
      console.warn('Webhook received without order_id')
      return res.json({ received: true, reason: 'No order_id' })
    }

    // Find the corresponding payment record
    const { data: payment, error: payError } = await supabase
      .from('payments')
      .select('id, booking_id, seeker_id, amount')
      .eq('cashfree_order_id', orderId)
      .maybeSingle()

    if (payError || !payment) {
      console.error(`Payment record not found for Cashfree order: ${orderId}`)
      return res.status(404).json({ error: 'Payment record not found' })
    }

    // Get the booking
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('*, pg:pg_listings(name, owner_id), seeker:profiles!bookings_seeker_id_fkey(full_name)')
      .eq('id', payment.booking_id)
      .single()

    if (bookingErr || !booking) {
      console.error(`Booking record not found for payment: ${payment.id}`)
      return res.status(404).json({ error: 'Booking record not found' })
    }

    switch (type) {
      case 'PAYMENT_SUCCESS_WEBHOOK': {
        // Complete the payment
        await supabase
          .from('payments')
          .update({
            status: 'completed',
            cashfree_payment_id: cfPaymentId || `cf_pay_${Date.now()}`
          })
          .eq('id', payment.id)

        // Update booking status
        await supabase
          .from('bookings')
          .update({
            status: 'payment_done',
            payment_id: payment.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', booking.id)

        // Lock and reserve the beds safely using the database transaction stored function
        if (booking.bed_id) {
          const { data: reservedOk, error: reserveErr } = await supabase.rpc('reserve_bed_safely', {
            p_bed_id: booking.bed_id,
            p_pg_id: booking.pg_id,
            p_num_beds: booking.num_beds || 1
          })

          if (reserveErr || !reservedOk) {
            console.error('Safe bed reservation failed in webhook:', reserveErr?.message || 'Bed no longer available')
            // Revert booking to cancelled and fail payment
            await supabase.from('payments').update({ status: 'failed' }).eq('id', payment.id)
            await supabase.from('bookings').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', booking.id)
            return res.status(400).json({ error: 'Bed no longer available. Booking cancelled.' })
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

        const seekerName = (booking as any)?.seeker?.full_name || 'Seeker'
        const pgName = (booking as any)?.pg?.name || 'PG'

        // Send notifications
          await supabase.from('notifications').insert([
            {
              user_id: booking.seeker_id,
              type: 'payment_success',
              title: 'Payment Successful & Invoice Generated',
              body: `Hello ${seekerName}, your payment of ₹${payment.amount} for ${pgName} is successful. Status: Completed. View Invoice: /invoice/seeker/${payment.id}`,
              data: { booking_id: booking.id, payment_id: payment.id, invoice_number: invoiceNumber, link: `/invoice/seeker/${payment.id}` },
            },
            {
              user_id: booking.owner_id,
              type: 'new_booking',
              title: 'Payment Received & Invoice Generated',
              body: `Dear Owner, seeker ${seekerName} has successfully paid. View Payout Statement: /invoice/owner/${payment.id}`,
              data: { booking_id: booking.id, payment_id: payment.id, invoice_number: invoiceNumber, link: `/invoice/owner/${payment.id}` },
            },
          ])
        break
      }

      case 'PAYMENT_FAILED_WEBHOOK': {
        await supabase
          .from('payments')
          .update({ status: 'failed' })
          .eq('id', payment.id)

        await supabase
          .from('bookings')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('id', booking.id)
        break
      }

      default:
        console.log('Unhandled Cashfree webhook event:', type)
    }

    res.json({ received: true })
  } catch (err: any) {
    console.error('Cashfree Webhook error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

export default router
