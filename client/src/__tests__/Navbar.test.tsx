import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Navbar } from '@/components/layout/Navbar'
import { renderWithProviders, mockAuthContext } from '../test/utils'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuthContext,
}))


describe('Navbar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders brand logo and title correctly', () => {
    renderWithProviders(<Navbar brandName="SwiftPG" />)
    expect(screen.getByText('Swift')).toBeInTheDocument()
    expect(screen.getByText('PG')).toBeInTheDocument()
  })

  it('displays the selected city in the location selector pill', () => {
    renderWithProviders(<Navbar selectedCity="Bangalore" />)
    expect(screen.getByText(/📍 Bangalore/i)).toBeInTheDocument()
  })

  it('opens location selector modal when location pill is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Navbar selectedCity="Bangalore" />)

    const locationBtn = screen.getByRole('button', { name: /Current location: Bangalore/i })
    await user.click(locationBtn)

    await waitFor(() => {
      expect(screen.getByText('Select Your City')).toBeInTheDocument()
      expect(screen.getByText('Popular Cities')).toBeInTheDocument()
      expect(screen.getByText('Mumbai')).toBeInTheDocument()
    })
  })

  it('updates city when a city is selected from the location modal', async () => {
    const user = userEvent.setup()
    const handleCityChange = vi.fn()

    renderWithProviders(<Navbar selectedCity="Bangalore" onCityChange={handleCityChange} />)

    const locationBtn = screen.getByRole('button', { name: /Current location: Bangalore/i })
    await user.click(locationBtn)

    await waitFor(() => {
      expect(screen.getByText('Select Your City')).toBeInTheDocument()
    })

    const mumbaiBtn = screen.getByRole('button', { name: /Mumbai/i })
    await user.click(mumbaiBtn)

    await waitFor(() => {
      expect(handleCityChange).toHaveBeenCalledWith('Mumbai')
    })
  })

  it('renders wishlist counter badge with provided count', () => {
    renderWithProviders(<Navbar wishlistCount={5} />)
    const badges = screen.getAllByText('5')
    expect(badges.length).toBeGreaterThan(0)
    expect(badges[0]).toBeInTheDocument()
  })


  it('renders navigation links and user profile dropdown trigger', () => {
    renderWithProviders(<Navbar />)
    expect(screen.getByText('Explore')).toBeInTheDocument()
    expect(screen.getByText('List Property')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /User Profile Menu/i })).toBeInTheDocument()
  })
})
