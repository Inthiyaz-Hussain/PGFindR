import { useEffect, useRef, useCallback, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { PGCard } from './PGCard'
import { Button } from '@/components/ui/button'
import { Loader2, Search, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { SharingTypeItem } from '@/types'
import type { PGListing } from '@/types'
import type { LocationState, SearchFilters } from '@/types/filters'

interface PGListProps {
  location: LocationState
  filters: SearchFilters
}

interface PGsResponse {
  data: (PGListing & { distance_meters?: number | null })[]
  total: number
  limit: number
  offset: number
}

async function fetchPGs({
  location,
  filters,
  pageParam = 0,
}: {
  location: LocationState
  filters: SearchFilters
  pageParam?: number
}): Promise<PGsResponse> {
  const params = new URLSearchParams()
  if (location.lat != null && location.lng != null) {
    params.set('lat', String(location.lat))
    params.set('lng', String(location.lng))
    params.set('radius', String(location.radius))
  }
  if (filters.query) params.set('q', filters.query)
  if (filters.minPrice > 0) params.set('min_price', String(filters.minPrice))
  if (filters.maxPrice < 20000) params.set('max_price', String(filters.maxPrice))
  if (filters.sharingTypes.length > 0) {
    params.set('sharing', filters.sharingTypes.join(','))
  }
  if (filters.food != null) params.set('food', String(filters.food))
  if (filters.gender) params.set('gender', filters.gender)
  if (filters.amenities.length > 0) {
    params.set('amenities', filters.amenities.join(','))
  }
  if (filters.availableOnly) params.set('available_only', 'true')
  params.set('limit', '20')
  params.set('offset', String(pageParam))
  const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/pgs?${params}`)
  if (!res.ok) throw new Error('Failed to fetch PGs')
  return res.json()
}

export function PGList({ location, filters }: PGListProps) {
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['pgs', location, filters],
    queryFn: ({ pageParam }) => fetchPGs({ location, filters, pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.data.length
      return nextOffset < lastPage.total ? nextOffset : undefined
    },
    enabled: location.lat != null && location.lng != null,
  })

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  )

  useEffect(() => {
    observerRef.current = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '100px',
      threshold: 0.1,
    })

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect()
    }
  }, [handleObserver])

  const allPGs = data?.pages.flatMap((page) => page.data) ?? []
  const totalCount = data?.pages[0]?.total ?? 0

  // ── Realtime: subscribe to sharing_types changes for all visible PGs ──
  const [liveAvailability, setLiveAvailability] = useState<Record<string, number>>({})
  const toastThrottleRef = useRef(false)

  useEffect(() => {
    if (allPGs.length === 0) return

    const pgIds = allPGs.map((p) => p.id)

    // Fetch initial availability snapshot for visible PGs
    supabase
      .from('sharing_types')
      .select('pg_id, total_beds, occupied_beds')
      .in('pg_id', pgIds)
      .then(({ data: sharingData }) => {
        if (!sharingData) return
        const map: Record<string, number> = {}
        for (const row of sharingData as unknown as SharingTypeItem[]) {
          const available = row.total_beds - row.occupied_beds
          map[row.pg_id] = (map[row.pg_id] || 0) + available
        }
        setLiveAvailability(map)
      })

    // Subscribe to all sharing_types changes (no filter — we filter client-side)
    const channel = supabase
      .channel(`sharing_types:home:${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sharing_types' },
        (payload) => {
          const row = (payload.eventType === 'DELETE'
            ? payload.old
            : payload.new) as SharingTypeItem
          if (!pgIds.includes(row.pg_id)) return

          // Re-fetch availability for the changed PG
          supabase
            .from('sharing_types')
            .select('total_beds, occupied_beds')
            .eq('pg_id', row.pg_id)
            .then(({ data: rows }) => {
              if (!rows) return
              const typedRows = rows as unknown as SharingTypeItem[]
              const available = typedRows.reduce(
                (sum, r) => sum + (r.total_beds - r.occupied_beds),
                0
              )
              setLiveAvailability((prev) => ({ ...prev, [row.pg_id]: available }))

              if (!toastThrottleRef.current) {
                toastThrottleRef.current = true
                toast.success('Bed availability just updated', {
                  description: 'Availability for nearby PGs has been refreshed.',
                })
                setTimeout(() => { toastThrottleRef.current = false }, 3000)
              }
            })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [allPGs.map((p) => p.id).join(',')])

  if (!location.lat || !location.lng) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <MapPin className="size-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Select your location</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Choose a city or allow location access to see PGs near you
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-destructive mb-4">
          {(error as Error).message || 'Failed to load PGs'}
        </p>
        <Button variant="outline" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  if (allPGs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Search className="size-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No PGs found</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Try adjusting your filters or searching in a different area
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {totalCount > 0 && (
        <p className="text-sm text-muted-foreground">
          {totalCount} PG{totalCount !== 1 ? 's' : ''} found
          {location.city && ` near ${location.city}`}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {allPGs.map((pg) => (
          <PGCard key={pg.id} pg={pg} liveAvailableBeds={liveAvailability[pg.id] ?? null} />
        ))}
      </div>

      {hasNextPage && (
        <div ref={loadMoreRef} className="flex items-center justify-center py-8">
          {isFetchingNextPage && <Loader2 className="size-6 animate-spin text-primary" />}
        </div>
      )}
    </div>
  )
}
