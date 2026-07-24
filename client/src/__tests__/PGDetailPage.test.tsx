import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Routes, Route } from 'react-router-dom'
import { PGDetailPage } from '../pages/pg/PGDetailPage'
import { renderWithProviders, mockAuthContext } from '../test/utils'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuthContext,
}))

// Mock fetch data
const mockPGData = {
  id: 'pg-123',
  name: 'CozyIndiranagar Girls PG',
  description: 'Nice ladies PG in Indiranagar',
  address: '12th Main Rd, Indiranagar',
  city: 'Bangalore',
  locality: 'Indiranagar',
  latitude: 12.9784,
  longitude: 77.6408,
  pg_type: 'girls',
  monthly_rent_min: 10000,
  monthly_rent_max: 15000,
  deposit_amount: 20000,
  rules: 'No smoking',
  avg_rating: 4.5,
  review_count: 2,
  photos: [{ id: 'photo-1', url: 'http://example.com/photo.jpg', is_primary: true }],
  amenities: [{ key: 'wifi', is_available: true }],
  sharing_types: [{ id: 'sharing-1', type: 2, price_monthly: 12000, price_daily: null, total_beds: 4, occupied_beds: 1 }],
  owner: { full_name: 'Jane Doe', phone: '9999999999' }
}

const mockReviewsData = {
  data: [
    { id: 'rev-1', rating: 5, comment: 'Great stay!', created_at: '2024-01-01T00:00:00Z', reviewer: { full_name: 'Amit Patel' } }
  ],
  total: 1,
  limit: 10,
  offset: 0
}

const mockNearbyPgsData = {
  data: [
    {
      id: 'pg-similar-1',
      name: 'Indiranagar Co-living',
      locality: 'Indiranagar',
      city: 'Bangalore',
      pg_type: 'co-ed',
      monthly_rent_min: 12000,
      monthly_rent_max: 18000,
      photos: []
    }
  ]
}

describe('PGDetailPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock scrollTo
    window.scrollTo = vi.fn()

    // Setup fetch mock
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/pgs/pg-123/reviews')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockReviewsData),
        } as Response)
      }
      if (url.includes('/api/pgs/pg-123')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPGData),
        } as Response)
      }
      if (url.includes('/api/pgs?q=')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockNearbyPgsData),
        } as Response)
      }
      return Promise.reject(new Error('Unknown URL: ' + url))
    })
  })

  it('renders PG Detail elements correctly including Map, Testimonials, and Similar PGs', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/pg/:id" element={<PGDetailPage />} />
      </Routes>,
      {
        initialEntries: ['/pg/pg-123']
      }
    )

    // Expect loading state first, then details
    await waitFor(() => {
      expect(screen.getByText('CozyIndiranagar Girls PG')).toBeInTheDocument()
    })

    // Check Location & Connectivity section is present
    expect(screen.getByText('Location & Connectivity')).toBeInTheDocument()
    expect(screen.getByText('Exact Address')).toBeInTheDocument()
    expect(screen.getAllByText(/12th Main Rd, Indiranagar/).length).toBeGreaterThan(0)

    // Check Indiranagar specific transit is shown
    expect(screen.getByText('Indiranagar Metro Station')).toBeInTheDocument()

    // Check Testimonials section is present
    expect(screen.getByText('Resident Testimonials')).toBeInTheDocument()
    expect(screen.getByText('Priya Nair')).toBeInTheDocument() // Priya Nair is in getTestimonials for girls PGs

    // Check Similar PGs section is present
    expect(screen.getByText('Similar PGs Nearby')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Indiranagar Co-living')).toBeInTheDocument()
    })
  })
})
