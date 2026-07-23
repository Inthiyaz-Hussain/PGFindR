import { screen } from '@testing-library/react'
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

  it('renders wishlist counter badge with provided count', () => {
    renderWithProviders(<Navbar wishlistCount={5} />)
    const badges = screen.getAllByText('5')
    expect(badges.length).toBeGreaterThan(0)
    expect(badges[0]).toBeInTheDocument()
  })

  it('renders navigation links and user profile dropdown trigger', () => {
    renderWithProviders(<Navbar />)
    expect(screen.getByText('Explore')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /User Profile Menu/i })).toBeInTheDocument()
  })
})
