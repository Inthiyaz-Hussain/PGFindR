/**
 * Payment verify route tests for Cashfree integration
 */

// ── Supabase mock ──────────────────────────────────────────────────────────

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
  select: jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue({
          data: [{ id: 'bed-001' }],
          error: null,
        }),
      }),
    }),
  }),
  update: jest.fn().mockReturnValue({
    in: jest.fn().mockResolvedValue({ error: null }),
    eq: jest.fn().mockResolvedValue({ error: null }),
  }),
}

const mockNotifInsertChain = {
  insert: jest.fn().mockResolvedValue({ error: null }),
}

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

const BOOKING_ID = 'book-001'

// ── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/payment/verify', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('200 with completed demo order', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'payments') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    maybeSingle: jest.fn().mockResolvedValue({
                      data: { id: 'pay-001', amount: 12000, booking_id: BOOKING_ID, cashfree_order_id: 'cf_order_demo_123' },
                      error: null,
                    })
                  })
                })
              })
            })
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'pay-001', amount: 12000, booking_id: BOOKING_ID, cashfree_order_id: 'cf_order_demo_123', status: 'completed' },
                  error: null,
                })
              })
            })
          })
        }
      }
      if (table === 'bookings') return mockBookingUpdateChain
      if (table === 'beds') return mockBedsUpdateChain
      if (table === 'notifications') return mockNotifInsertChain
      return { update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }) }
    })

    const res = await request(app)
      .post('/api/payment/verify')
      .send({
        booking_id: BOOKING_ID,
      })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.status).toBe('payment_done')
    expect(res.body.booking_id).toBe(BOOKING_ID)
  })

  test('400 when payment status is not paid or verify fails', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'payments') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    maybeSingle: jest.fn().mockResolvedValue({
                      data: { id: 'pay-001', amount: 12000, booking_id: BOOKING_ID, cashfree_order_id: 'cf_order_failed_123' },
                      error: null,
                    })
                  })
                })
              })
            })
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null })
          })
        }
      }
      return { update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }) }
    })

    const res = await request(app)
      .post('/api/payment/verify')
      .send({
        booking_id: BOOKING_ID,
      })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/failed|not completed/i)
  })

  test('400 when booking_id is missing', async () => {
    const res = await request(app)
      .post('/api/payment/verify')
      .send({})

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/required/i)
  })
})
