/**
 * PGCard tests:
 *  - shows "Full" (red) badge when available_beds === 0
 *  - shows "N left" (amber) badge when available_beds <= 2
 *  - shows "N beds" (green) badge when available_beds > 2
 *  - liveAvailableBeds prop overrides pg.available_beds
 */

import { screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PGCard } from '@/components/pg/PGCard'
import { renderWithProviders } from '../test/utils'
import type { PGListing } from '@/types'

const basePG: PGListing = {
  id: 'pg-001',
  owner_id: 'owner-001',
  name: 'Sunrise PG',
  description: 'A great PG',
  address: '123 Main St',
  city: 'Bangalore',
  locality: 'Koramangala',
  latitude: 12.9716,
  longitude: 77.5946,
  pg_type: 'boys',
  status: 'approved',
  total_beds: 10,
  available_beds: 5,
  monthly_rent_min: 8000,
  monthly_rent_max: 12000,
  deposit_amount: 16000,
  food_included: true,
  wifi_included: true,
  ac_rooms: false,
  parking: false,
  laundry: false,
  security_24x7: false,
  rules: null,
  commission_rate: 5,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  photos: [],
}

describe('PGCard — availability badge', () => {
  it('shows "Full" when available_beds is 0', () => {
    renderWithProviders(<PGCard pg={{ ...basePG, available_beds: 0 }} />)
    expect(screen.getByText('Full')).toBeInTheDocument()
  })

  it('shows "1 left" when available_beds is 1', () => {
    renderWithProviders(<PGCard pg={{ ...basePG, available_beds: 1 }} />)
    expect(screen.getByText('1 left')).toBeInTheDocument()
  })

  it('shows "2 left" when available_beds is 2', () => {
    renderWithProviders(<PGCard pg={{ ...basePG, available_beds: 2 }} />)
    expect(screen.getByText('2 left')).toBeInTheDocument()
  })

  it('shows "5 beds" when available_beds is 5', () => {
    renderWithProviders(<PGCard pg={{ ...basePG, available_beds: 5 }} />)
    expect(screen.getByText('5 beds')).toBeInTheDocument()
  })

  it('liveAvailableBeds=0 overrides pg.available_beds and shows "Full"', () => {
    renderWithProviders(
      <PGCard pg={{ ...basePG, available_beds: 5 }} liveAvailableBeds={0} />
    )
    expect(screen.getByText('Full')).toBeInTheDocument()
    expect(screen.queryByText('5 beds')).not.toBeInTheDocument()
  })

  it('liveAvailableBeds=1 overrides pg.available_beds=0', () => {
    renderWithProviders(
      <PGCard pg={{ ...basePG, available_beds: 0 }} liveAvailableBeds={1} />
    )
    expect(screen.getByText('1 left')).toBeInTheDocument()
    expect(screen.queryByText('Full')).not.toBeInTheDocument()
  })
})

describe('PGCard — general content', () => {
  it('renders PG name and locality', () => {
    renderWithProviders(<PGCard pg={basePG} />)

    expect(screen.getByText('Sunrise PG')).toBeInTheDocument()
    expect(screen.getByText(/Koramangala/)).toBeInTheDocument()
  })

  it('renders price with /month suffix', () => {
    renderWithProviders(<PGCard pg={basePG} />)
    expect(screen.getByText(/₹8,000/)).toBeInTheDocument()
    expect(screen.getByText(/\/month/)).toBeInTheDocument()
  })

  it('shows distance badge when distance_meters is provided', () => {
    renderWithProviders(
      <PGCard pg={{ ...basePG, distance_meters: 450 }} />
    )
    expect(screen.getByText('450m away')).toBeInTheDocument()
  })

  it('shows km distance for distances >= 1000m', () => {
    renderWithProviders(
      <PGCard pg={{ ...basePG, distance_meters: 2500 }} />
    )
    expect(screen.getByText('2.5km away')).toBeInTheDocument()
  })

  it('renders amenity icons for enabled amenities', () => {
    renderWithProviders(<PGCard pg={{ ...basePG, wifi_included: true, food_included: true }} />)
    expect(screen.getByText('WiFi')).toBeInTheDocument()
    expect(screen.getByText('Food')).toBeInTheDocument()
  })
})
