/**
 * LoginPage tests:
 *  - renders email and password fields with submit button
 *  - shows toast error on wrong credentials
 *  - navigates to role-based route on success
 *  - shows inline Zod validation errors for empty fields
 */

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LoginPage } from '@/pages/auth/LoginPage'
import { renderWithProviders, mockAuthContext } from '../test/utils'

// vi.mock is hoisted before imports — must be in the test file, not a utility.
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
  Toaster: () => null,
}))

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthContext.login.mockResolvedValue({ error: null, profile: mockAuthContext.profile })
  })

  it('renders email input, password input, and sign-in button', () => {
    renderWithProviders(<LoginPage />)

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    // Use anchored regex to avoid matching the "Show password" aria-label button
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows error toast on invalid credentials', async () => {
    const user = userEvent.setup()
    const { toast } = await import('sonner')

    mockAuthContext.login.mockResolvedValue({
      error: new Error('Invalid login credentials'),
      profile: null,
    })

    renderWithProviders(<LoginPage />)

    await user.type(screen.getByLabelText(/email address/i), 'bad@test.com')
    await user.type(screen.getByLabelText(/^password$/i), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Invalid login credentials')
    })
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('navigates to /owner on successful owner login', async () => {
    const user = userEvent.setup()
    const { toast } = await import('sonner')

    mockAuthContext.login.mockResolvedValue({
      error: null,
      profile: { ...mockAuthContext.profile, role: 'owner' as const },
    })

    renderWithProviders(<LoginPage />)

    await user.type(screen.getByLabelText(/email address/i), 'owner@test.com')
    await user.type(screen.getByLabelText(/^password$/i), 'pass123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Welcome back!')
      expect(mockNavigate).toHaveBeenCalledWith('/owner', { replace: true })
    })
  })

  it('navigates to /seeker on successful seeker login', async () => {
    const user = userEvent.setup()

    renderWithProviders(<LoginPage />)

    await user.type(screen.getByLabelText(/email address/i), 'seeker@test.com')
    await user.type(screen.getByLabelText(/^password$/i), 'pass123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/seeker', { replace: true })
    })
  })

  it('shows Zod validation error when email is invalid', async () => {
    const user = userEvent.setup()

    renderWithProviders(<LoginPage />)

    await user.type(screen.getByLabelText(/email address/i), 'not-an-email')
    // Submit to trigger validation
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument()
    })
  })
})
