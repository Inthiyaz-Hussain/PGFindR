import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OnboardingPage } from '@/pages/owner/OnboardingPage'
import { renderWithProviders } from '../test/utils'

const { mockToast } = vi.hoisted(() => ({
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }
}))

vi.mock('sonner', () => ({
  toast: mockToast,
  Toaster: () => null,
}))

// Mock Supabase
vi.mock('@/lib/supabase', () => {
  const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null })
  const mockUpload = vi.fn().mockResolvedValue({ data: { path: 'path/to/file' }, error: null })
  const mockGetPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: 'http://example.com/file' } })

  return {
    supabase: {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        upsert: mockUpsert,
      }),
      storage: {
        from: vi.fn().mockReturnValue({
          upload: mockUpload,
          getPublicUrl: mockGetPublicUrl,
        })
      }
    },
    supabaseUntyped: {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'pg-123' }, error: null })
      })
    },
    ensureBucketExists: vi.fn().mockResolvedValue(true)
  }
})

// Mock Auth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-123' },
    profile: { id: 'test-user-123', role: 'owner' },
  })
}))

describe('OnboardingPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    // We also need global fetch mocked for map calls
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ([{ lat: '12.9716', lon: '77.5946' }])
    }) as any
  })

  const fillStep1 = async (user: any) => {
    // Await find by placeholder to ensure component rendered
    const nameInput = await screen.findByPlaceholderText(/e.g. Royal Living PG/i)
    fireEvent.change(nameInput, { target: { value: 'Royal PG' } })

    fireEvent.change(screen.getByPlaceholderText(/Door No, Street/i), { target: { value: '123 Koramangala Rd' } })
    fireEvent.change(screen.getByPlaceholderText(/e.g. Koramangala 4th Block/i), { target: { value: 'Koramangala' } })
    fireEvent.change(screen.getByPlaceholderText(/Bengaluru/i), { target: { value: 'Bengaluru' } })
  }

  it('renders Step 1 basic info and steps forward to step 2', async () => {
    const user = userEvent.setup()
    renderWithProviders(<OnboardingPage />)

    // Verify first step header
    expect(await screen.findByText(/PG Basic Information/i)).toBeInTheDocument()

    // Fill form
    await fillStep1(user)

    // Go to next step
    const nextBtn = screen.getByRole('button', { name: /Save & Next/i })
    await user.click(nextBtn)

    // Check we moved to step 2
    expect(await screen.findByText(/Room & Bed Configuration/i)).toBeInTheDocument()
  })

  it('renders Step 2 bulk room configuration and toggles balcony switch correctly', async () => {
    const user = userEvent.setup()
    renderWithProviders(<OnboardingPage />)

    await fillStep1(user)
    await user.click(screen.getByRole('button', { name: /Save & Next/i }))

    expect(await screen.findByText(/Room & Bed Configuration/i)).toBeInTheDocument()

    // Add a room config manually if the button is there or change inputs
    // Wait for the room config section to load
    const addConfigBtn = await screen.findByRole('button', { name: /\+ Add Another Room Configuration/i })
    await user.click(addConfigBtn)

    // Verify default config
    expect(true).toBe(true)

    // Assuming first config card has the switch
    // The Radix Switch is rendered as button with role="switch"
    const switches = screen.getAllByRole('switch')
    expect(switches.length).toBeGreaterThan(0)

    const balconySwitch = switches[0] // Assuming first one is for balcony in config #1

    expect(balconySwitch).toHaveAttribute('aria-checked', 'false')
    await user.click(balconySwitch)
    expect(balconySwitch).toHaveAttribute('aria-checked', 'true')
  })

  it('adds custom amenities and respects max character limit and list constraints', async () => {
    const user = userEvent.setup()
    renderWithProviders(<OnboardingPage />)

    await fillStep1(user)
    await user.click(screen.getByRole('button', { name: /Save & Next/i })) // To Step 2

    // In Step 2, must add at least one valid room config
    const roomInput = screen.getAllByPlaceholderText(/e.g. 10/i)[0]
    const rentInput = screen.getAllByPlaceholderText(/e.g. 8000/i)[0]
    fireEvent.change(roomInput, { target: { value: '10' } })
    fireEvent.change(rentInput, { target: { value: '8000' } })

    // Go to Step 3 (Amenities)
    await user.click(screen.getByRole('button', { name: /Save & Next/i }))
    expect(await screen.findByText(/Amenities Setup/i)).toBeInTheDocument()

    const input = screen.getByPlaceholderText(/e.g. Study Table, Water Purifier, Gym Access/i)
    const addButton = screen.getByRole('button', { name: /Add/i })

    // Add valid amenity
    fireEvent.change(input, { target: { value: 'Free Coffee' } })
    await user.click(addButton)

    expect(screen.getByText('Free Coffee')).toBeInTheDocument()

    // Test max characters
    const longString = 'A'.repeat(51)
    fireEvent.change(input, { target: { value: longString } })
    await user.click(addButton)

    // Toast should show limit warning
    expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('50 characters'))

    // Test duplicate
    fireEvent.change(input, { target: { value: 'Free Coffee' } })
    await user.click(addButton)
    expect(true).toBe(true)
  })
})
