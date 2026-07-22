/**
 * PG search route tests: distance sorting, availability_only filter.
 */

// ── Supabase mock ──────────────────────────────────────────────────────────

const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockOr = jest.fn()
const mockGte = jest.fn()
const mockLte = jest.fn()
const mockGt = jest.fn()
const mockIn = jest.fn()
const mockOrder = jest.fn()
const mockLimit = jest.fn()

// Chain: supabase.from().select().eq().order().limit()
const chainEnd = { data: [], error: null }

// We'll configure the resolved data before each test
let queryResult: { data: any[]; error: null | Error } = { data: [], error: null }

const queryBuilder = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  gt: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockImplementation(() => Promise.resolve(queryResult)),
  single: jest.fn().mockImplementation(() => Promise.resolve(queryResult)),
}

const mockSupabase = {
  auth: {
    admin: { createUser: jest.fn() },
    signInWithPassword: jest.fn(),
    getUser: jest.fn(),
  },
  from: jest.fn().mockReturnValue(queryBuilder),
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

// PG rows at different lat/lng from Bangalore city center (12.9716, 77.5946)
const nearPG = {
  id: 'pg-near',
  name: 'Near PG',
  status: 'approved',
  latitude: 12.9720, // ~100m away
  longitude: 77.5950,
  available_beds: 3,
  monthly_rent_min: 8000,
  photos: [],
}
const farPG = {
  id: 'pg-far',
  name: 'Far PG',
  status: 'approved',
  latitude: 12.9900, // ~2km away
  longitude: 77.6100,
  available_beds: 0,
  monthly_rent_min: 6000,
  photos: [],
}

describe('GET /api/pgs', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Re-attach mock return
    mockSupabase.from.mockReturnValue(queryBuilder)
    // Default: beds query returns nothing (no sharing filter)
    queryResult = { data: [farPG, nearPG], error: null }
    Object.assign(queryBuilder, {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue(queryResult),
    })
  })

  test('returns PGs sorted by distance when lat/lng provided', async () => {
    queryBuilder.limit.mockResolvedValue({ data: [farPG, nearPG], error: null })

    const res = await request(app)
      .get('/api/pgs')
      .query({ lat: '12.9716', lng: '77.5946', radius: '5000' })

    expect(res.status).toBe(200)
    // nearPG should come first (smaller distance)
    const ids = res.body.data.map((p: any) => p.id)
    expect(ids.indexOf('pg-near')).toBeLessThan(ids.indexOf('pg-far'))
    // Each result should have distance_meters
    expect(res.body.data[0].distance_meters).toBeDefined()
    expect(res.body.data[0].distance_meters).toBeLessThan(
      res.body.data[1].distance_meters
    )
  })

  test('excludes fully-booked PGs when available_only=true', async () => {
    // Both PGs returned by DB, but farPG has 0 available_beds
    queryBuilder.limit.mockResolvedValue({ data: [nearPG, farPG], error: null })

    const res = await request(app)
      .get('/api/pgs')
      .query({ available_only: 'true' })

    expect(res.status).toBe(200)
    // The route adds a .gt('available_beds', 0) filter – verify it was called
    expect(queryBuilder.gt).toHaveBeenCalledWith('available_beds', 0)
  })

  test('returns empty array when no PGs match', async () => {
    queryBuilder.limit.mockResolvedValue({ data: [], error: null })

    const res = await request(app).get('/api/pgs')

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(0)
    expect(res.body.total).toBe(0)
  })

  test('applies min_price and max_price filters', async () => {
    queryBuilder.limit.mockResolvedValue({ data: [nearPG], error: null })

    const res = await request(app)
      .get('/api/pgs')
      .query({ min_price: '5000', max_price: '12000' })

    expect(res.status).toBe(200)
    expect(queryBuilder.gte).toHaveBeenCalledWith('monthly_rent_min', 5000)
    expect(queryBuilder.lte).toHaveBeenCalledWith('monthly_rent_min', 12000)
  })
})
