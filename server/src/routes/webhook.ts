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

export default router
