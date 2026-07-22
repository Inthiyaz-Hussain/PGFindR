/**
 * Payment verify route tests:
 *  - valid Razorpay signature → 200
 *  - tampered signature → 400 + marks payment as failed
 */

import crypto from 'crypto'

const RAZORPAY_SECRET = 'test_razorpay_secret'

// ── Supabase mock ──────────────────────────────────────────────────────────

const mockPaymentUpdate = jest.fn()
const mockPaymentUpdateChain = {
  update: jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'pay-001',
            amount: 12000,
            booking_id: 'book-001',
          },
          error: null,
        }),
      }),
    }),
  }),
}

const mockBookingUpdateChain = {
  update: jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { bed_id: 'bed-001', seeker_id: 'seeker-001', owner_id: 'owner-001', pg_id: 'pg-001' },
          error: null,
        }),
      }),
    }),
  }),
}

const mockBedsUpdateChain = {
  update: jest.fn().mockReturnValue({
    eq: jest.fn().mockResolvedValue({ error: null }),
  }),
}

const mockNotifInsertChain = {
  insert: jest.fn().mockResolvedValue({ error: null }),
}

// Track failed-payment update
const mockFailedPaymentUpdate = jest.fn().mockReturnValue({
  eq: jest.fn().mockResolvedValue({ error: null }),
})

const mockSupabase = {
  auth: {
    admin: { createUser: jest.fn() },
    signInWithPassword: jest.fn(),
    getUser: jest.fn(),
  },
  from: jest.fn(),
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockReturnValue(mockSupabase),
}))

jest.mock('razorpay', () =>
  jest.fn().mockImplementation(() => ({
    orders: { create: jest.fn().mockResolvedValue({ id: 'order_test', amount: 1200000, currency: 'INR' }) },
    payouts: { create: jest.fn() },
  }))
)

jest.mock('../lib/firebase', () => ({
  initializeFirebase: jest.fn(),
  sendPushNotification: jest.fn(),
  messaging: null,
}))

jest.mock('morgan', () => jest.fn(() => (_req: any, _res: any, next: any) => next()))
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
  messaging: jest.fn(() => ({ send: jest.fn() })),
  apps: [],
}))

import request from 'supertest'

let app: any

beforeAll(async () => {
  app = (await import('../index')).default
})

// ── Helpers ────────────────────────────────────────────────────────────────

function makeSignature(orderId: string, paymentId: string, secret: string) {
  const body = `${orderId}|${paymentId}`
  return crypto.createHmac('sha256', secret).update(body).digest('hex')
}

const ORDER_ID = 'order_abc123'
const PAYMENT_ID = 'pay_xyz789'
const BOOKING_ID = 'book-001'

// ── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/payment/verify', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'payments') {
        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'pay-001', amount: 12000, booking_id: BOOKING_ID },
                  error: null,
                }),
              }),
            }),
          }),
        }
      }
      if (table === 'bookings') return mockBookingUpdateChain
      if (table === 'beds') return mockBedsUpdateChain
      if (table === 'notifications') return mockNotifInsertChain
      return { update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }) }
    })
  })

  test('200 with a valid Razorpay signature', async () => {
    const validSig = makeSignature(ORDER_ID, PAYMENT_ID, RAZORPAY_SECRET)

    const res = await request(app)
      .post('/api/payment/verify')
      .send({
        razorpay_order_id: ORDER_ID,
        razorpay_payment_id: PAYMENT_ID,
        razorpay_signature: validSig,
        booking_id: BOOKING_ID,
      })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.status).toBe('payment_done')
    expect(res.body.booking_id).toBe(BOOKING_ID)
  })

  test('400 with a tampered (invalid) signature', async () => {
    const tamperedSig = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

    // When signature fails the payment row should be marked failed
    const markFailedEq = jest.fn().mockResolvedValue({ error: null })
    const markFailedUpdate = jest.fn().mockReturnValue({ eq: markFailedEq })
    mockSupabase.from.mockReturnValue({ update: markFailedUpdate })

    const res = await request(app)
      .post('/api/payment/verify')
      .send({
        razorpay_order_id: ORDER_ID,
        razorpay_payment_id: PAYMENT_ID,
        razorpay_signature: tamperedSig,
        booking_id: BOOKING_ID,
      })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/[Ii]nvalid.*signature|signature.*invalid/i)
    // The failed-payment update should have been called
    expect(markFailedUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }))
  })

  test('400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/payment/verify')
      .send({ razorpay_order_id: ORDER_ID }) // missing payment_id, signature, booking_id

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/[Mm]issing/)
  })
})
