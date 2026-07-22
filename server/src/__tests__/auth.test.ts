/**
 * Auth route tests: register, login, invalid credentials, duplicate email.
 *
 * Mocks @supabase/supabase-js so createClient returns a controlled mock,
 * then imports the Express app and exercises routes via supertest.
 */

import crypto from 'crypto'

// ── Supabase mock ──────────────────────────────────────────────────────────

const mockAdminCreateUser = jest.fn()
const mockSignInWithPassword = jest.fn()
const mockGetUser = jest.fn()
const mockProfileUpdate = jest.fn()
const mockProfileSelect = jest.fn()

// Fluent builder helpers
const makeFrom = (methods: Record<string, jest.Mock>) => ({
  from: jest.fn().mockReturnValue(methods),
})

const mockSupabase = {
  auth: {
    admin: { createUser: mockAdminCreateUser },
    signInWithPassword: mockSignInWithPassword,
    getUser: mockGetUser,
  },
  from: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({ single: mockProfileSelect }),
    }),
  }),
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockReturnValue(mockSupabase),
}))

jest.mock('../lib/firebase', () => ({
  initializeFirebase: jest.fn(),
  sendPushNotification: jest.fn().mockResolvedValue(undefined),
  messaging: null,
}))

jest.mock('morgan', () => jest.fn(() => (_req: any, _res: any, next: any) => next()))
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
  messaging: jest.fn(() => ({ send: jest.fn() })),
  apps: [],
}))

// ── Import app after mocks ─────────────────────────────────────────────────

import request from 'supertest'

let app: any

beforeAll(async () => {
  app = (await import('../index')).default
})

// ── Helpers ────────────────────────────────────────────────────────────────

const validUser = {
  id: 'uuid-123',
  email: 'test@example.com',
  user_metadata: { full_name: 'Test User', role: 'seeker' },
}

const validSession = {
  user: validUser,
  session: {
    access_token: 'tok_123',
    refresh_token: 'ref_123',
    expires_at: 9999999999,
  },
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Profile select returns a profile row
    mockProfileSelect.mockResolvedValue({
      data: { id: validUser.id, full_name: 'Test User', role: 'seeker', phone: null },
      error: null,
    })
    // Admin createUser succeeds
    mockAdminCreateUser.mockResolvedValue({ data: { user: validUser }, error: null })
    // Sign-in after register succeeds
    mockSignInWithPassword.mockResolvedValue({ data: validSession, error: null })
  })

  test('201 with valid data', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'secret123', role: 'seeker' })

    expect(res.status).toBe(201)
    expect(res.body.user).toMatchObject({ email: 'test@example.com', role: 'seeker' })
    expect(res.body.session.access_token).toBe('tok_123')
  })

  test('400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'secret123' }) // missing name and role

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/required/)
  })

  test('400 when password is shorter than 6 characters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'User', email: 'test@example.com', password: 'abc', role: 'seeker' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/6 characters/)
  })

  test('409 when email is already registered', async () => {
    mockAdminCreateUser.mockResolvedValue({
      data: null,
      error: { message: 'User already registered with this email' },
    })

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'User', email: 'dup@example.com', password: 'secret123', role: 'seeker' })

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/already/)
  })
})

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockProfileSelect.mockResolvedValue({
      data: { id: validUser.id, full_name: 'Test User', role: 'seeker', phone: null },
      error: null,
    })
  })

  test('200 with correct credentials', async () => {
    mockSignInWithPassword.mockResolvedValue({ data: validSession, error: null })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'secret123' })

    expect(res.status).toBe(200)
    expect(res.body.user.email).toBe('test@example.com')
    expect(res.body.session.access_token).toBe('tok_123')
  })

  test('401 with invalid credentials', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Invalid login credentials' },
    })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrongpass' })

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/Invalid login credentials/)
  })

  test('400 when fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com' }) // missing password

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/required/)
  })
})
