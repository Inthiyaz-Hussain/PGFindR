/**
 * AvailabilitySection realtime tests:
 *  - renders bed grid with correct counts
 *  - realtime UPDATE event changes occupied/available bed counts
 *  - shows success toast when occupancy changes
 *  - does NOT toast when only price changes (occupancy unchanged)
 *  - INSERT event adds a new sharing type
 *  - DELETE event removes a sharing type
 *  - onSelect fires when Select is clicked
 *  - channel is removed on unmount
 */

import { screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AvailabilitySection } from '@/components/pg/AvailabilitySection'
import { renderWithProviders } from '../test/utils'
import type { SharingTypeItem } from '@/types'

// ── vi.hoisted: runs before vi.mock factories ─────────────────────────────

const { channelMock, removeChannelMock, callbackRef } = vi.hoisted(() => {
  // Mutable container so callbacks survive vi.clearAllMocks() in beforeEach
  const callbackRef: { current: ((payload: any) => void) | null } = { current: null }
  const removeChannelMock = vi.fn()

  // Build channelMock as a plain object so on().on() chaining works
  const self: Record<string, any> = {}
  self.on = vi.fn().mockImplementation((event: string, _cfg: any, cb: any) => {
    if (event === 'postgres_changes') callbackRef.current = cb
    return self
  })
  self.subscribe = vi.fn().mockReturnValue(self)

  return { channelMock: self, removeChannelMock, callbackRef }
})

// Override the global @/lib/supabase mock (from setup.ts) for this file
vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: vi.fn().mockReturnValue(channelMock),
    removeChannel: removeChannelMock,
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
    }),
  },
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
  Toaster: () => null,
}))

// ── Fixtures ──────────────────────────────────────────────────────────────

const sharingType: SharingTypeItem = {
  id: 'st-001',
  pg_id: 'pg-001',
  type: 2,
  price_monthly: 10000,
  price_daily: null,
  total_beds: 4,
  occupied_beds: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const defaultProps = {
  pgId: 'pg-001',
  initialSharingTypes: [sharingType],
  onSelect: vi.fn(),
  selectedId: undefined,
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('AvailabilitySection', () => {
  beforeEach(() => {
    // Reset the captured callback and mocks before each test
    callbackRef.current = null
    vi.clearAllMocks()
    // Restore on() so new renders capture their callback correctly
    channelMock.on.mockImplementation((event: string, _cfg: any, cb: any) => {
      if (event === 'postgres_changes') callbackRef.current = cb
      return channelMock
    })
    channelMock.subscribe.mockReturnValue(channelMock)
  })

  it('renders available and occupied bed counts', () => {
    renderWithProviders(<AvailabilitySection {...defaultProps} />)
    // 4 total - 1 occupied = 3 available
    expect(screen.getByText(/3 available/)).toBeInTheDocument()
    expect(screen.getByText(/1 occupied/)).toBeInTheDocument()
  })

  it('shows Select button for available sharing type', () => {
    renderWithProviders(<AvailabilitySection {...defaultProps} />)
    expect(screen.getByRole('button', { name: /select/i })).toBeInTheDocument()
  })

  it('shows Fully Occupied button when no beds are available', () => {
    const fullSharing = { ...sharingType, occupied_beds: 4 }
    renderWithProviders(
      <AvailabilitySection {...defaultProps} initialSharingTypes={[fullSharing]} />
    )
    expect(screen.getByRole('button', { name: /fully occupied/i })).toBeInTheDocument()
  })

  it('updates counts when realtime UPDATE event fires', async () => {
    renderWithProviders(<AvailabilitySection {...defaultProps} />)

    expect(callbackRef.current).not.toBeNull()

    act(() => {
      callbackRef.current!({
        eventType: 'UPDATE',
        new: { ...sharingType, occupied_beds: 3 },
        old: sharingType,
      })
    })

    await waitFor(() => {
      expect(screen.getByText(/1 available/)).toBeInTheDocument()
      expect(screen.getByText(/3 occupied/)).toBeInTheDocument()
    })
  })

  it('fires success toast when occupancy changes', async () => {
    const { toast } = await import('sonner')

    renderWithProviders(<AvailabilitySection {...defaultProps} />)

    act(() => {
      callbackRef.current!({
        eventType: 'UPDATE',
        new: { ...sharingType, occupied_beds: 2 },
        old: sharingType,
      })
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Bed availability just updated',
        expect.objectContaining({ description: expect.any(String) })
      )
    })
  })

  it('does NOT fire toast when only price changes (occupancy unchanged)', async () => {
    const { toast } = await import('sonner')

    renderWithProviders(<AvailabilitySection {...defaultProps} />)

    act(() => {
      callbackRef.current!({
        eventType: 'UPDATE',
        new: { ...sharingType, price_monthly: 11000 },
        old: sharingType,
      })
    })

    await new Promise((r) => setTimeout(r, 200))
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('adds new sharing type on INSERT event', async () => {
    renderWithProviders(<AvailabilitySection {...defaultProps} />)

    const singleSharing: SharingTypeItem = {
      ...sharingType,
      id: 'st-002',
      type: 1,
      total_beds: 2,
      occupied_beds: 0,
    }

    act(() => {
      callbackRef.current!({ eventType: 'INSERT', new: singleSharing, old: {} })
    })

    await waitFor(() => {
      expect(screen.getByText('Single Sharing')).toBeInTheDocument()
    })
  })

  it('removes sharing type on DELETE event', async () => {
    renderWithProviders(<AvailabilitySection {...defaultProps} />)

    expect(screen.getByText('Double Sharing')).toBeInTheDocument()

    act(() => {
      callbackRef.current!({ eventType: 'DELETE', new: {}, old: sharingType })
    })

    await waitFor(() => {
      expect(screen.queryByText('Double Sharing')).not.toBeInTheDocument()
    })
  })

  it('calls onSelect with the sharing type when Select is clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    renderWithProviders(<AvailabilitySection {...defaultProps} onSelect={onSelect} />)

    await user.click(screen.getByRole('button', { name: /select/i }))

    expect(onSelect).toHaveBeenCalledWith(sharingType)
  })

  it('removes the realtime channel on unmount', () => {
    const { unmount } = renderWithProviders(<AvailabilitySection {...defaultProps} />)

    unmount()

    expect(removeChannelMock).toHaveBeenCalledWith(channelMock)
  })
})
