/**
 * FilterPanel tests:
 *  - selecting a sharing type toggle updates filter state
 *  - clicking Apply calls onApply with updated filters
 *  - clicking Reset calls onApply with all defaults (preserving query)
 */

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FilterPanel } from '@/components/home/FilterPanel'
import { renderWithProviders } from '../test/utils'
import { DEFAULT_FILTERS, type SearchFilters } from '@/types/filters'

const baseFilters: SearchFilters = {
  ...DEFAULT_FILTERS,
  query: 'bangalore',
}

describe('FilterPanel', () => {
  const onOpenChange = vi.fn()
  const onApply = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders filter options when open', () => {
    renderWithProviders(
      <FilterPanel open filters={baseFilters} onOpenChange={onOpenChange} onApply={onApply} />
    )

    expect(screen.getByText('Filters')).toBeInTheDocument()
    expect(screen.getByText('Sharing Type')).toBeInTheDocument()
    expect(screen.getByText('Single')).toBeInTheDocument()
    expect(screen.getByText('Double')).toBeInTheDocument()
    expect(screen.getByText('Apply Filters')).toBeInTheDocument()
    expect(screen.getByText('Reset')).toBeInTheDocument()
  })

  it('selecting sharing type buttons updates filter, Apply calls onApply', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <FilterPanel open filters={baseFilters} onOpenChange={onOpenChange} onApply={onApply} />
    )

    // Toggle "Single" sharing type on
    await user.click(screen.getByText('Single'))
    // Toggle "Double" sharing type on
    await user.click(screen.getByText('Double'))

    // Click Apply
    await user.click(screen.getByText('Apply Filters'))

    await waitFor(() => {
      expect(onApply).toHaveBeenCalledTimes(1)
      const appliedFilters: SearchFilters = onApply.mock.calls[0][0]
      expect(appliedFilters.sharingTypes).toContain(1)
      expect(appliedFilters.sharingTypes).toContain(2)
      // Query string is preserved
      expect(appliedFilters.query).toBe('bangalore')
    })
  })

  it('toggling a sharing type twice removes it', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <FilterPanel open filters={baseFilters} onOpenChange={onOpenChange} onApply={onApply} />
    )

    await user.click(screen.getByText('Triple'))
    await user.click(screen.getByText('Triple')) // toggle off
    await user.click(screen.getByText('Apply Filters'))

    await waitFor(() => {
      const appliedFilters: SearchFilters = onApply.mock.calls[0][0]
      expect(appliedFilters.sharingTypes).not.toContain(3)
    })
  })

  it('Reset clears all filters except query and calls onApply', async () => {
    const user = userEvent.setup()

    // Start with some active filters
    const activeFilters: SearchFilters = {
      ...baseFilters,
      sharingTypes: [1, 2],
      gender: 'boys',
      availableOnly: true,
    }

    renderWithProviders(
      <FilterPanel open filters={activeFilters} onOpenChange={onOpenChange} onApply={onApply} />
    )

    // Reset button should be enabled since filters are modified
    const resetBtn = screen.getByRole('button', { name: /reset/i })
    await user.click(resetBtn)
    await user.click(screen.getByText('Apply Filters'))

    await waitFor(() => {
      const appliedFilters: SearchFilters = onApply.mock.calls[0][0]
      expect(appliedFilters.sharingTypes).toHaveLength(0)
      expect(appliedFilters.gender).toBeNull()
      expect(appliedFilters.availableOnly).toBe(false)
      expect(appliedFilters.minPrice).toBe(0)
      expect(appliedFilters.maxPrice).toBe(20000)
      // Query is preserved from initial filters.query
      expect(appliedFilters.query).toBe('bangalore')
    })
  })

  it('does not render content when closed', () => {
    renderWithProviders(
      <FilterPanel open={false} filters={baseFilters} onOpenChange={onOpenChange} onApply={onApply} />
    )

    expect(screen.queryByText('Apply Filters')).not.toBeInTheDocument()
  })
})
