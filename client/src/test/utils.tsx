import React from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import type { Profile } from '@/types'

// Default mock profile — tests can override login.mockResolvedValue() etc.
export const mockProfile: Profile = {
  id: 'user-123',
  full_name: 'Test User',
  phone: '9876543210',
  avatar_url: null,
  role: 'seeker',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

// Mutable auth context shared with test files.
// NOTE: vi.mock('@/hooks/useAuth') must be declared in each test file that
// needs it (vi.mock is only hoisted in the actual test file, not here).
export const mockAuthContext = {
  user: { id: 'user-123', email: 'test@example.com' } as any,
  session: null,
  profile: mockProfile as Profile | null,
  loading: false,
  isLoading: false,
  profileLoading: false,
  login: vi.fn().mockResolvedValue({ error: null, profile: mockProfile }),
  logout: vi.fn().mockResolvedValue(undefined),
  register: vi.fn().mockResolvedValue({ error: null }),
  signIn: vi.fn().mockResolvedValue({ error: null }),
  signUp: vi.fn().mockResolvedValue({ error: null }),
  signOut: vi.fn().mockResolvedValue(undefined),
  refreshProfile: vi.fn().mockResolvedValue(undefined),
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

interface TestWrapperOptions extends RenderOptions {
  initialEntries?: string[]
}

export function renderWithProviders(
  ui: React.ReactElement,
  { initialEntries = ['/'], ...options }: TestWrapperOptions = {}
) {
  const queryClient = makeQueryClient()

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...options })
}
