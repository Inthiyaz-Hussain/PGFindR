import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PGFormPage } from '../pages/owner/PGFormPage'
import { renderWithProviders, mockAuthContext, mockProfile } from '../test/utils'
import { Routes, Route } from 'react-router-dom'

// Mock useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuthContext,
}))

// Mock Supabase clients
vi.mock('@/lib/supabase', () => {
  const mockFrom = (table: string) => {
    if (table === 'profiles') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [
                { id: 'owner-123', full_name: 'John Doe', phone: '1234567890', email: 'john@example.com' }
              ],
              error: null
            })
          })
        })
      }
    }
    if (table === 'pg_listings') {
      return {
        select: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }
    }
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      })
    }
  }

  return {
    supabaseUntyped: {
      from: mockFrom
    },
    supabase: {
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ error: null }),
          getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'http://example.com/photo.jpg' } })
        })
      }
    },
    compressImage: vi.fn().mockImplementation((file) => Promise.resolve(file))
  }
})

describe('PGFormPage Component - Owner Assignment Buttons', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthContext.profile = {
      ...mockProfile,
      role: 'admin'
    }
  })

  it('renders assignment panel options for admin, toggles mode, and correctly syncs autofilled details', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <Routes>
        <Route path="/admin/pgs/:id" element={<PGFormPage />} />
      </Routes>,
      {
        initialEntries: ['/admin/pgs/new']
      }
    )

    // Expect layout basic headers
    expect(screen.getByText('Owner Assignment')).toBeInTheDocument()

    // 1. Verify tab buttons are present
    const selectTabBtn = screen.getByRole('button', { name: /select existing owner/i })
    const createTabBtn = screen.getByRole('button', { name: /create new owner inline/i })
    expect(selectTabBtn).toBeInTheDocument()
    expect(createTabBtn).toBeInTheDocument()

    // 2. Click "Create New Owner Inline"
    await user.click(createTabBtn)

    // Form inputs for owner creation should be visible
    expect(screen.getByText('Create New Owner Details')).toBeInTheDocument()
    expect(screen.getByLabelText(/owner password/i)).toBeInTheDocument()

    // 3. Click "Select Existing Owner" (choose an owner button)
    await user.click(selectTabBtn)

    // Form inputs for owner creation should disappear, and Select field placeholder should be present
    expect(screen.queryByText('Create New Owner Details')).not.toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })
})
