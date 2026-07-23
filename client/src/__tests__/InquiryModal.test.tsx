/**
 * InquiryModal tests:
 *  - required field validation shows inline errors
 *  - valid submission POSTs correctly formatted payload and calls onSuccess
 *  - server error shows toast
 *  - unauthenticated user sees sign-in toast
 */

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { InquiryModal } from '@/components/inquiry/InquiryModal'
import { renderWithProviders, mockAuthContext } from '../test/utils'

vi.setConfig({ testTimeout: 15000 })
import { server } from '../test/msw/server'
import { supabase } from '@/lib/supabase'
import type { SharingTypeItem } from '@/types'

// vi.mock must be in the test file for hoisting to work
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('sonner', () => {
  const t = vi.fn() as any
  t.error = vi.fn()
  t.success = vi.fn()
  t.info = vi.fn()
  return {
    toast: t,
    Toaster: () => null,
  }
})

// ── Fixtures ───────────────────────────────────────────────────────────────

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
    // Restore default authenticated user
    mockAuthContext.user = { id: 'user-123', email: 'test@example.com' } as any
    mockAuthContext.profile = {
      id: 'user-123',
      full_name: 'Test User',
      phone: '9876543210',
      avatar_url: null,
      role: 'seeker',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }
  })

  it('shows validation error when full name is empty', async () => {
    const user = userEvent.setup()

    renderWithProviders(<InquiryModal {...defaultProps} />)

    // Clear pre-filled name
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

    await user.click(screen.getByRole('button', { name: /submit|send/i }))

    await waitFor(() => {
      expect(screen.getByText(/10 digits/i)).toBeInTheDocument()
    })
  })

  it('submits correctly formatted payload and calls onSuccess', async () => {
    const user = userEvent.setup()
    let capturedBody: any

    server.use(
      http.post('*/api/inquiry', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(
          { id: 'inq-new', message: 'Inquiry submitted successfully' },
          { status: 201 }
        )
      })
    )

    renderWithProviders(<InquiryModal {...defaultProps} />)

    const mobileInput = screen.getByPlaceholderText(/10 digits/i)
    await user.clear(mobileInput)
    await user.type(mobileInput, '9876543210')

    const dateInput = screen.getByLabelText(/move.in date/i)
    await user.type(dateInput, tomorrow())

    const cityInput = screen.getByPlaceholderText(/where are you from/i)
    await user.type(cityInput, 'Mumbai')

    await user.click(screen.getByRole('button', { name: /submit|send/i }))

    await waitFor(() => {
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
    const { toast } = await import('sonner')

    server.use(
      http.post('*/api/inquiry', () =>
        HttpResponse.json({ error: 'Server unavailable' }, { status: 500 })
      )
    )

    renderWithProviders(<InquiryModal {...defaultProps} />)

    const mobileInput = screen.getByPlaceholderText(/10 digits/i)
    await user.clear(mobileInput)
    await user.type(mobileInput, '9876543210')

    const dateInput = screen.getByLabelText(/move.in date/i)
    await user.type(dateInput, tomorrow())

    const cityInput = screen.getByPlaceholderText(/where are you from/i)
    await user.type(cityInput, 'Delhi')

    await user.click(screen.getByRole('button', { name: /submit|send/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Server unavailable')
    })
  })

  it('shows email verification and handles submit for unauthenticated users', async () => {
    const user = userEvent.setup()
    mockAuthContext.user = null as any
    mockAuthContext.profile = null as any

    // Mock register and login context callbacks
    mockAuthContext.register = vi.fn().mockResolvedValue({ error: null })
    mockAuthContext.login = vi.fn().mockImplementation(async (email) => {
      mockAuthContext.user = { id: 'user-guest-456', email } as any
      mockAuthContext.profile = { id: 'user-guest-456', full_name: 'Guest User', role: 'seeker' } as any
      return { error: null, profile: mockAuthContext.profile }
    })

    const spyGetSession = vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: {
        session: {
          access_token: 'mock-token',
          user: { id: 'user-guest-456', email: 'guest@example.com' } as any
        } as any
      },
      error: null
    })

    let capturedBody: any
    server.use(
      http.post('*/api/inquiry', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(
          { id: 'inq-guest', message: 'Inquiry submitted successfully' },
          { status: 201 }
        )
      })
    )

    localStorage.setItem('seeker_id', 'user-guest-456')
    renderWithProviders(<InquiryModal {...defaultProps} />)

    // Verify email field is shown
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument()

    // Submit button is disabled by default (no email or valid data yet)
    const submitBtn = screen.getByRole('button', { name: /submit inquiry/i })
    expect(submitBtn).toBeDisabled()

    // Type email
    const emailInput = screen.getByPlaceholderText(/you@example.com/i)
    await user.type(emailInput, 'guest@example.com')

    // Click Send OTP
    const sendOtpBtn = screen.getByRole('button', { name: /Send OTP/i })
    await user.click(sendOtpBtn)

    // Type OTP
    const otpInput = await screen.findByPlaceholderText(/e.g. 123456/i)
    await user.type(otpInput, '123456')

    // Click Verify
    const verifyBtn = screen.getByRole('button', { name: /Verify/i })
    await user.click(verifyBtn)

    // Fill other fields
    const nameInput = screen.getByPlaceholderText(/your full name/i)
    await user.type(nameInput, 'Guest User')

    const mobileInput = screen.getByPlaceholderText(/10 digits/i)
    await user.type(mobileInput, '9876543210')

    const dateInput = screen.getByLabelText(/move.in date/i)
    await user.type(dateInput, tomorrow())

    const cityInput = screen.getByPlaceholderText(/where are you from/i)
    await user.type(cityInput, 'Pune')

    // Submit button should now be enabled
    await waitFor(() => {
      expect(submitBtn).not.toBeDisabled()
    })

    await user.click(submitBtn)

    await waitFor(() => {
      expect(defaultProps.onSuccess).toHaveBeenCalledWith('inq-guest')
    })

    expect(capturedBody).toMatchObject({
      pg_id: 'pg-001',
      seeker_id: 'user-guest-456',
      mobile: '9876543210',
      city_of_origin: 'Pune',
    })

    spyGetSession.mockRestore()
  })
})
