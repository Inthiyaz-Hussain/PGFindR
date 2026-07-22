/**
 * Inquiry route tests:
 *  - unauthenticated request returns 401
 *  - valid authenticated request creates inquiry and triggers notification
 */

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockGetUser = jest.fn()
const mockSendPush = jest.fn().mockResolvedValue(undefined)
const mockCreateNotification = jest.fn().mockResolvedValue(undefined)
const mockGetFcmToken = jest.fn().mockResolvedValue('fcm-token-123')

const inquiryInsertChain = {
  insert: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  single: jest.fn(),
}

const pgSelectChain = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
}

const profileSelectChain = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
}

const notifInsertChain = {
  insert: jest.fn().mockResolvedValue({ error: null }),
}

const mockSupabase = {
  auth: {
    admin: { createUser: jest.fn() },
    signInWithPassword: jest.fn(),
    getUser: mockGetUser,
  },
  from: jest.fn(),
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockReturnValue(mockSupabase),
}))

jest.mock('../lib/firebase', () => ({
  initializeFirebase: jest.fn(),
  sendPushNotification: mockSendPush,
  messaging: null,
}))

jest.mock('../lib/notifications', () => ({
  createNotification: mockCreateNotification,
  getUserFcmToken: mockGetFcmToken,
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

// ── Fixtures ───────────────────────────────────────────────────────────────

const mockUser = { id: 'seeker-001', email: 'seeker@test.com', user_metadata: { role: 'seeker' } }
const mockPG = { id: 'pg-001', owner_id: 'owner-001', name: 'Test PG', status: 'approved' }
const mockInquiryRow = {
  id: 'inq-001',
  pg_id: 'pg-001',
  seeker_id: 'seeker-001',
  full_name: 'Rahul Kumar',
  mobile: '9876543210',
  status: 'pending',
  created_at: new Date().toISOString(),
}

const validBody = {
  pg_id: 'pg-001',
  seeker_id: 'seeker-001',
  full_name: 'Rahul Kumar',
  mobile: '9876543210',
  age: 25,
  move_in_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
  sharing_preference: 2,
  occupation: 'Student',
  city_of_origin: 'Delhi',
  duration_value: 6,
  duration_unit: 'months',
  message: 'Looking for a quiet room.',
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/inquiry', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Profile lookup by auth middleware
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') return profileSelectChain
      if (table === 'pg_listings') return pgSelectChain
      if (table === 'inquiries') return inquiryInsertChain
      if (table === 'notifications') return notifInsertChain
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn() }
    })

    profileSelectChain.single.mockResolvedValue({
      data: { id: mockUser.id, role: 'seeker' },
      error: null,
    })
    pgSelectChain.single.mockResolvedValue({ data: mockPG, error: null })
    inquiryInsertChain.single.mockResolvedValue({ data: mockInquiryRow, error: null })
  })

  test('401 when no Authorization header', async () => {
    const res = await request(app)
      .post('/api/inquiry')
      .send(validBody)

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/[Aa]uthorization/)
  })

  test('401 when token is invalid', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    })

    const res = await request(app)
      .post('/api/inquiry')
      .set('Authorization', 'Bearer bad-token')
      .send(validBody)

    expect(res.status).toBe(401)
    expect(res.body.error).toBeTruthy()
  })

  test('201 with valid auth and body — creates inquiry and fires notification', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })

    const res = await request(app)
      .post('/api/inquiry')
      .set('Authorization', 'Bearer valid-token')
      .send(validBody)

    expect(res.status).toBe(201)
    expect(res.body.id).toBe('inq-001')

    // Should have tried to send a push notification to the PG owner
    expect(mockSendPush).toHaveBeenCalled()
  })

  test('400 when mobile is not 10 digits', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })

    const res = await request(app)
      .post('/api/inquiry')
      .set('Authorization', 'Bearer valid-token')
      .send({ ...validBody, mobile: '12345' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/mobile|10.*digit/i)
  })
})
