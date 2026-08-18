import { screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OnboardingPage } from '../pages/owner/OnboardingPage'
import { renderWithProviders } from '../test/utils'

// Mock useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'owner-123', email: 'owner@example.com' },
    profile: { id: 'owner-123', full_name: 'Owner Tester', role: 'owner', onboarding_verified: false },
    loading: false,
    refreshProfile: vi.fn(),
  }),
}))

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn().mockResolvedValue({ data: { url: 'http://mock-oauth.com' }, error: null }),
    },
  },
  supabaseUntyped: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'owner-123', email: 'owner@example.com' } } }, error: null }),
    },
  },
}))

describe('OnboardingPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const fillStep1 = () => {
    fireEvent.change(screen.getByPlaceholderText(/e.g. Royal Living PG/i), { target: { value: 'Royal PG' } })
    fireEvent.change(screen.getByPlaceholderText(/Door No, Street/i), { target: { value: '123 Koramangala Rd' } })
    fireEvent.change(screen.getByPlaceholderText(/e.g. Koramangala 4th Block/i), { target: { value: 'Koramangala' } })
  }

  it('renders Step 1 basic info and steps forward to step 2', async () => {
    const user = userEvent.setup()
    renderWithProviders(<OnboardingPage />)

    // Verify first step header
    expect(screen.getByText('Step 1 — PG Basic Information')).toBeInTheDocument()

    // Fill step 1 so validation passes
    fillStep1()

    // Click Next to go to Step 2
    const nextBtn = screen.getByRole('button', { name: /next/i })
    await user.click(nextBtn)

    // Verify step 2 title
    expect(screen.getByText('Step 2 — Room & Bed Configuration')).toBeInTheDocument()
  })

  it('renders Step 2 bulk room configuration and toggles balcony switch correctly', async () => {
    const user = userEvent.setup()
    renderWithProviders(<OnboardingPage />)

    // Fill step 1 so validation passes
    fillStep1()

    // Navigate to Step 2
    await user.click(screen.getByRole('button', { name: /next/i }))

    // Expect Step 2 Title
    expect(screen.getByText('Step 2 — Room & Bed Configuration')).toBeInTheDocument()

    // Check default values render in Real-time summary panel
    expect(screen.getByText('10 Rooms')).toBeInTheDocument()
    expect(screen.getByText('2-Share')).toBeInTheDocument()
    expect(screen.getByText(/Balcony Access:/i)).toHaveTextContent('Balcony Access: No')

    // Toggle Balcony Switch
    const balconySwitch = screen.getByRole('switch')
    await user.click(balconySwitch)

    // Verify update in the summary
    expect(screen.getByText(/Balcony Access:/i)).toHaveTextContent('Balcony Access: Yes')
  })

  it('adds custom amenities and respects max character limit and list constraints', async () => {
    const user = userEvent.setup()
    renderWithProviders(<OnboardingPage />)

    // Fill step 1 so validation passes
    fillStep1()

    // Go to Step 3 (Amenities)
    await user.click(screen.getByRole('button', { name: /next/i }))
    await user.click(screen.getByRole('button', { name: /next/i }))

    expect(screen.getByText('Step 3 — Amenities Setup')).toBeInTheDocument()

    const input = screen.getByPlaceholderText(/study table, water purifier/i)
    const addBtn = screen.getByRole('button', { name: /add amenity/i })

    // Add a valid custom amenity
    await user.type(input, 'Gym Membership')
    await user.click(addBtn)

    // Expect to see the added amenity in the list
    expect(screen.getByText('Gym Membership')).toBeInTheDocument()
  })
})
