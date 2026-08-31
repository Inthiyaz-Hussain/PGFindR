import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InquiryModal } from '@/components/inquiry/InquiryModal'
import { renderWithProviders } from '../test/utils'

vi.setConfig({ testTimeout: 15000 })
import { supabase } from '@/lib/supabase'
import type { SharingTypeItem } from '@/types'

const mockUser = { id: 'user-123', email: 'test@example.com' }
const mockSession = { access_token: 'fake-token', user: mockUser }

const { mockAuthContext, mockToast } = vi.hoisted(() => ({
  mockAuthContext: {
    user: { id: 'user-123', email: 'test@example.com' } as any,
    session: { access_token: 'fake-token', user: { id: 'user-123', email: 'test@example.com' } } as any,
    profile: {
      id: 'user-123',
      full_name: 'Test User',
      phone: '9876543210',
      avatar_url: null,
      role: 'seeker',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    } as any
  },
  mockToast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn()
  }
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('sonner', () => ({
  toast: mockToast,
  Toaster: () => null,
}))

// Mock Supabase
vi.mock('@/lib/supabase', () => {
  const mockChain = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: vi.fn().mockImplementation((cb) => {
      cb({ data: [{ id: 'room1', sharing_type: 1, sharing_type_id: '1', num_rooms: 10, occupied_beds: 0, beds: [] }], error: null })
      return Promise.resolve({ data: [{ id: 'room1', sharing_type: 1, sharing_type_id: '1', num_rooms: 10, occupied_beds: 0, beds: [] }], error: null })
    })
  }

  return {
    supabase: {
      auth: {
        signInWithOAuth: vi.fn().mockResolvedValue({ data: { url: 'http://auth.com' }, error: null }),
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: 'fake-token', user: { id: 'user-123', email: 'test@example.com' } } },
          error: null
        }),
      },
      from: vi.fn().mockReturnValue(mockChain),
    },
    supabaseUntyped: {
      from: vi.fn().mockReturnValue(mockChain),
    }
  }
})

const sharingTypes: SharingTypeItem[] = [
  {
    id: 'st-001',
    pg_id: 'pg-001',
    type: 2,
    price_monthly: 10000,
    price_daily: null,
    total_beds: 4,
    occupied_beds: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  pgId: 'pg-001',
  pgName: 'Test PG',
  sharingTypes,
  onSuccess: vi.fn(),
}

function tomorrow() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

describe('InquiryModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Explicitly set the variables again
    mockAuthContext.user = { id: 'user-123', email: 'test@example.com' } as any
    mockAuthContext.session = { access_token: 'fake-token', user: { id: 'user-123', email: 'test@example.com' } } as any

    vi.spyOn(supabase.auth, 'getSession').mockImplementation(async () => {
      return { data: { session: mockSession }, error: null } as any
    })

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'inq-new', message: 'Inquiry submitted successfully' })
    } as any)
  })

  it('shows validation error when full name is empty', async () => {
    const user = userEvent.setup()
    renderWithProviders(<InquiryModal {...defaultProps} />)
    const nameInput = screen.getByPlaceholderText(/your full name/i)
    await user.clear(nameInput)
    const submitBtn = screen.getByRole('button', { name: /submit|send/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/full name is required/i)).toBeInTheDocument()
    })
  })

  it('shows validation error when mobile is fewer than 10 digits', async () => {
    const user = userEvent.setup()
    renderWithProviders(<InquiryModal {...defaultProps} />)
    const mobileInput = screen.getByPlaceholderText(/10 digits/i)
    await user.clear(mobileInput)
    await user.type(mobileInput, '12345')
    const submitBtn = screen.getByRole('button', { name: /submit|send/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/10 digits/i)).toBeInTheDocument()
    })
  })

  it('submits correctly formatted payload and calls onSuccess', async () => {
    const user = userEvent.setup()
    let capturedBody: any

    vi.spyOn(global, 'fetch').mockImplementation(async (url, options: any) => {
      capturedBody = JSON.parse(options.body)
      return {
        ok: true,
        json: async () => ({ id: 'inq-new', message: 'Inquiry submitted successfully' })
      } as any
    })

    // To prevent the activeSession bug, mock getSession explicitly AND make sure provider is google
    const localSession = {
      access_token: 'fake-token',
      user: {
        id: 'user-123',
        email: 'test@example.com',
        app_metadata: { provider: 'google' }
      }
    }
    mockAuthContext.user = localSession.user as any
    mockAuthContext.session = localSession as any

    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
        data: { session: localSession }
    } as any)

    renderWithProviders(<InquiryModal {...defaultProps} />)

    await screen.findByDisplayValue('Test User') // await for re-render if it matters

    const mobileInput = screen.getByPlaceholderText(/10 digits/i)
    await user.clear(mobileInput)
    await user.type(mobileInput, '9876543210')

    const dateInput = screen.getByLabelText(/move.in date/i)
    fireEvent.change(dateInput, { target: { value: tomorrow() } })

    const cityInput = screen.getByPlaceholderText(/where are you from\?/i)
    await user.type(cityInput, 'Mumbai')

    const termsCheckbox = screen.getByRole('checkbox', { hidden: true })
    if(termsCheckbox && !termsCheckbox.checked) {
       await user.click(termsCheckbox)
    }

    const form = screen.getByRole('dialog').querySelector('form')
    fireEvent.submit(form!)

    await waitFor(() => {
      if (mockToast.error.mock.calls.length > 0) {
        console.error("UNEXPECTED TOAST ERRORS:", mockToast.error.mock.calls)
      }
      expect(defaultProps.onSuccess).toHaveBeenCalledWith('inq-new')
    })

    expect(capturedBody).toMatchObject({
      pg_id: 'pg-001',
      seeker_id: 'user-123',
      mobile: '9876543210',
      city_of_origin: 'Mumbai',
    })
  })

  it('shows error toast on server 500', async () => {
    const user = userEvent.setup()

    vi.spyOn(global, 'fetch').mockImplementation(async () => {
      return {
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server unavailable' })
      } as any
    })

    const localSession = {
      access_token: 'fake-token',
      user: {
        id: 'user-123',
        email: 'test@example.com',
        app_metadata: { provider: 'google' }
      }
    }
    mockAuthContext.user = localSession.user as any
    mockAuthContext.session = localSession as any

    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
        data: { session: localSession }
    } as any)

    renderWithProviders(<InquiryModal {...defaultProps} />)

    await screen.findByDisplayValue('Test User')

    const mobileInput = screen.getByPlaceholderText(/10 digits/i)
    await user.clear(mobileInput)
    await user.type(mobileInput, '9876543210')

    const dateInput = screen.getByLabelText(/move.in date/i)
    fireEvent.change(dateInput, { target: { value: tomorrow() } })

    const cityInput = screen.getByPlaceholderText(/where are you from\?/i)
    await user.type(cityInput, 'Delhi')

    const termsCheckbox = screen.getByRole('checkbox', { hidden: true })
    if(termsCheckbox && !termsCheckbox.checked) {
       await user.click(termsCheckbox)
    }

    const form = screen.getByRole('dialog').querySelector('form')
    fireEvent.submit(form!)

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('Server unavailable'))
    })
  })

  it('shows Google Sign-In card and handles Google sign-in for unauthenticated users', async () => {
    const user = userEvent.setup()

    mockAuthContext.user = null as any
    mockAuthContext.session = null as any
    mockAuthContext.profile = null as any

    vi.spyOn(supabase.auth, 'getSession').mockImplementation(async () => {
      return { data: { session: null }, error: null } as any
    })

    const spySignIn = vi.spyOn(supabase.auth, 'signInWithOAuth').mockResolvedValue({
      data: {} as any,
      error: null
    })

    renderWithProviders(<InquiryModal {...defaultProps} />)

    expect(screen.getByText(/Google Verification Required/i)).toBeInTheDocument()

    const submitBtn = screen.getByRole('button', { name: /submit|send/i })
    expect(submitBtn).toBeDisabled()

    const googleBtn = screen.getByRole('button', { name: /Verify with Google/i })
    await user.click(googleBtn)

    expect(spySignIn).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: expect.any(String),
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        }
      }
    })

    spySignIn.mockRestore()
  })
})
